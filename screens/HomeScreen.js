import React, { useContext, useMemo, useState, useEffect } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Linking,
  Modal,
  Haptics,
  Animated,
  Dimensions,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import AccountCreatedScreen from './AccountCreatedScreen'
import VoxxyFooter from '../components/VoxxyFooter'
import { Users, Calendar, Clock, HelpCircle, X, Plus, Zap, CheckCircle, BookOpen, Mail, Coffee, MapPin, Star, User, Activity } from 'react-native-feather'
import CustomHeader from '../components/CustomHeader'
import YourCommunity from '../components/YourCommunity'
import ProfileSnippet from '../components/ProfileSnippet'
import { useNavigation } from '@react-navigation/native';
import PushNotificationService from '../services/PushNotificationService';
import { API_URL } from '../config';
import { Alert } from 'react-native';

const { width: screenWidth } = Dimensions.get('window')

const FILTERS = [
  { key: 'In Progress', icon: Zap, label: 'In Progress' },
  { key: 'Finalized', icon: CheckCircle, label: 'Finalized' },
  { key: 'Past', icon: BookOpen, label: 'Past' },
  { key: 'Invites', icon: Mail, label: 'Invites' }
]

const PREVIEW_PAST = 3
const CARD_MARGIN = 12
const CARD_PADDING = 16

// Activity type configuration
const ACTIVITY_CONFIG = {
  'Restaurant': {
    displayText: 'Lets Eat!',
    countdownText: 'Hope you and your crew savored every bite together! 🥂',
    countdownLabel: 'Meal Starts In',
    emoji: '🍜'
  },
  'Meeting': {
    displayText: 'Lets Meet!',
    countdownText: 'Convos unlocked and plans locked in—high-five to your crew! 🙌',
    countdownLabel: 'Meeting Starts In',
    emoji: '⏰'
  },
  'Game Night': {
    displayText: 'Game Time!',
    countdownText: 'Dice rolled, friendships scored—your group leveled up the fun! 🏆',
    countdownLabel: 'Game Night Starts In',
    emoji: '🎮'
  },
  'Cocktails': {
    displayText: 'Lets Go Out!',
    countdownText: 'Cheers to wild laughs and brighter memories—what a crew! 🥂',
    countdownLabel: 'Your Outing Starts In',
    emoji: '🍸'
  }
}

// Helper function to get activity display info
function getActivityDisplayInfo(activityType) {
  return ACTIVITY_CONFIG[activityType] || {
    displayText: 'Lets Meet!',
    countdownText: 'ACTIVITY STARTED',
    countdownLabel: 'Activity Starts In',
    emoji: '🎉'
  }
}

function useCountdown(targetTs) {
  const [timeLeft, setTimeLeft] = useState(Math.max(targetTs - Date.now(), 0))
  useEffect(() => {
    if (timeLeft <= 0) return
    const id = setInterval(() => {
      const rem = Math.max(targetTs - Date.now(), 0)
      setTimeLeft(rem)
      if (rem === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [targetTs, timeLeft])

  const days = Math.floor(timeLeft / (24 * 3600000))
  const hrs = Math.floor((timeLeft % (24 * 3600000)) / 3600000)
  const mins = Math.floor((timeLeft % 3600000) / 60000)
  const secs = Math.floor((timeLeft % 60000) / 1000)
  const pad = n => String(n).padStart(2, '0')

  return { days, hrs, mins, secs, formatted: `${pad(hrs + days * 24)}:${pad(mins)}:${pad(secs)}` }
}

function CountdownText({ targetTs, activityType }) {
  const countdown = useCountdown(targetTs)
  const displayInfo = getActivityDisplayInfo(activityType)

  if (countdown.days === 0 && countdown.hrs === 0 && countdown.mins === 0 && countdown.secs === 0) {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>
          {displayInfo.countdownText}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.countdownLabel}>
        {displayInfo.countdownLabel}
      </Text>
      <View style={styles.countdownGrid}>
        {countdown.days > 0 && (
          <View style={styles.countdownBlock}>
            <Text style={styles.countdownNumber}>{countdown.days}</Text>
            <Text style={styles.countdownUnit}>day{countdown.days !== 1 ? 's' : ''}</Text>
          </View>
        )}
        <View style={styles.countdownBlock}>
          <Text style={styles.countdownNumber}>{countdown.hrs}</Text>
          <Text style={styles.countdownUnit}>hrs</Text>
        </View>
        <View style={styles.countdownBlock}>
          <Text style={styles.countdownNumber}>{countdown.mins}</Text>
          <Text style={styles.countdownUnit}>min</Text>
        </View>
        <View style={styles.countdownBlock}>
          <Text style={styles.countdownNumber}>{countdown.secs}</Text>
          <Text style={styles.countdownUnit}>sec</Text>
        </View>
      </View>
    </View>
  )
}

function ProgressDisplay({ activity }) {
  const pins = activity.pinned_activities || []
  const ideas = pins.length
  const hasSelectedPin = pins.some(p => p.selected)
  const hasDateTime = activity.date_day && activity.date_time

  let stage = 'collecting'
  let stageDisplay = 'Collecting Ideas'
  let progress = 33

  if (hasSelectedPin && hasDateTime) {
    stage = 'finalized'
    const displayInfo = getActivityDisplayInfo(activity.activity_type)
    stageDisplay = 'Ready to Go'
    progress = 100
  } else if (ideas > 0) {
    stage = 'voting'
    stageDisplay = 'Finalizing Plans'
    progress = 67
  }

  return (
    <View style={styles.progressOverlay}>
      <Text style={styles.progressStage}>{stageDisplay}</Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    </View>
  )
}

// Create New Activity Card with conditional content
function CreateCard({ navigation, isLast, isInvitesEmpty = false }) {
  const title = isInvitesEmpty ? 'No Current Invites' : 'Create New Activity'
  const subtitle = isInvitesEmpty ? 'Be the first to invite your friends!' : 'Start planning something amazing!'
  const actionText = isInvitesEmpty ? 'Start planning now →' : 'Tap to start →'

  return (
    <TouchableOpacity
      style={[
        styles.createCard,
        isLast && styles.lastCard,
        isInvitesEmpty && styles.invitesEmptyCard
      ]}
      onPress={() => {
        if (Haptics?.impactAsync) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        }
        navigation.navigate('TripDashboardScreen')
      }}
      activeOpacity={0.9}
    >
      <View style={[styles.createCardGlow, isInvitesEmpty && styles.invitesGlow]} />

      <View style={styles.createCardContent}>
        <View style={[styles.createIconContainer, isInvitesEmpty && styles.invitesIconContainer]}>
          {isInvitesEmpty ? (
            <Mail stroke="#d394f5" width={28} height={28} strokeWidth={2.5} />
          ) : (
            <Plus stroke="#4ECDC4" width={28} height={28} strokeWidth={2.5} />
          )}
        </View>

        <Text style={styles.createTitle}>{title}</Text>
        <Text style={styles.createSubtitle}>{subtitle}</Text>

        {!isInvitesEmpty && (
          <View style={styles.createSuggestions}>
            <View style={styles.suggestionIcon}>
              <Coffee stroke="#FF6B6B" width={18} height={18} strokeWidth={2} />
            </View>
            <View style={styles.suggestionIcon}>
              <Star stroke="#4ECDC4" width={18} height={18} strokeWidth={2} />
            </View>
            <View style={styles.suggestionIcon}>
              <MapPin stroke="#FFE66D" width={18} height={18} strokeWidth={2} />
            </View>
            <View style={styles.suggestionIcon}>
              <User stroke="#A8E6CF" width={18} height={18} strokeWidth={2} />
            </View>
          </View>
        )}

        {isInvitesEmpty && (
          <View style={styles.invitesEmptyIcon}>
            <Text style={styles.invitesEmptyEmoji}>💌</Text>
          </View>
        )}

        <View style={[styles.createArrow, isInvitesEmpty && styles.invitesArrow]}>
          <Text style={[styles.createArrowText, isInvitesEmpty && styles.invitesArrowText]}>{actionText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// Modern Tab Component
function ModernTab({ filter, isActive, onPress, count }) {
  const handlePress = () => {
    if (Haptics?.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress()
  }

  const IconComponent = filter.icon

  return (
    <TouchableOpacity
      style={[
        styles.modernTab,
        isActive && styles.modernTabActive
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.tabContent}>
        <IconComponent
          stroke={isActive ? '#fff' : '#B8A5C4'}
          width={16}
          height={16}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <Text style={[
          styles.tabLabel,
          isActive && styles.tabLabelActive
        ]}>
          {filter.label}
        </Text>
        {filter.key === 'Invites' && count > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}


export default function HomeScreen() {
  const { user } = useContext(UserContext)
  const navigation = useNavigation()
  const [mainTab, setMainTab] = useState('Activities')
  const [filter, setFilter] = useState('In Progress')
  const [showAllPast, setShowAllPast] = useState(false)

  if (user && !user.confirmed_at) {
    return <AccountCreatedScreen />
  }

  const activities = useMemo(() => {
    const mine = user?.activities || []
    const theirs = user?.participant_activities
      ?.filter(p => p.accepted)
      .map(p => p.activity) || []
    return [...new Map([...mine, ...theirs].map(a => [a.id, a])).values()]
  }, [user])

  const inProgress = activities.filter(a => !a.finalized && !a.completed)
  const finalized = activities.filter(a => a.finalized && !a.completed)
  const past = activities.filter(a => a.completed)
  const invites = user?.participant_activities
    ?.filter(p => !p.accepted)
    .map(p => p.activity) || []

  useEffect(() => {
    if (invites.length > 0) {
      setFilter('Invites')
    } else if (inProgress.length > 0) {
      setFilter('In Progress')
    } else if (finalized.length > 0) {
      setFilter('Finalized')
    } else {
      setFilter('Past')
    }
  }, [invites.length, inProgress.length, finalized.length])

  const filteredActivities = (() => {
    const dataMap = {
      'In Progress': inProgress,
      'Finalized': finalized,
      'Past': past,
      'Invites': invites,
    }

    const data = dataMap[filter] || []

    return data.sort((a, b) => {
      const dateA = new Date(a.date_day || '9999-12-31')
      const dateB = new Date(b.date_day || '9999-12-31')

      if (filter === 'Past') {
        return dateB - dateA // Most recent first for past activities
      }
      return dateA - dateB // Soonest first for upcoming activities
    })
  })()

  const displayedActivities = filter === 'Past' && !showAllPast
    ? filteredActivities.slice(0, PREVIEW_PAST)
    : filteredActivities

  function formatDate(dateString) {
    if (!dateString) return 'TBD'
    const [year, month, day] = dateString.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    const monthName = d.toLocaleString('en-US', { month: 'long' })
    const dayNum = d.getDate()
    const getOrdinalSuffix = (day) => {
      if (day >= 11 && day <= 13) return 'th'
      switch (day % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    }
    return `${monthName} ${dayNum}${getOrdinalSuffix(dayNum)}`
  }

  function formatTime(timeString) {
    if (!timeString) return 'TBD'
    const timePortion = timeString.split('T')[1]
    const [rawHour, rawMin] = timePortion.split(':')
    let hour = parseInt(rawHour, 10)
    const suffix = hour >= 12 ? 'pm' : 'am'
    hour = hour % 12 || 12
    return `${hour}:${rawMin} ${suffix}`
  }

  function getEventDateTime(activity) {
    if (!activity.date_day || !activity.date_time) return null
    const [Y, M, D] = activity.date_day.split('-').map(Number)
    const rawTime = activity.date_time.slice(11, 19)
    const [h, m, s] = rawTime.split(':').map(Number)
    return new Date(Y, M - 1, D, h, m, s).getTime()
  }



  function renderCard({ item, index }) {
    const firstName = item.user?.name?.split(' ')[0] || ''
    const isInvite = invites.some(invite => invite.id === item.id)
    const isInProgress = !item.finalized && !item.completed && !isInvite
    const isFinalizedWithDateTime = item.finalized && item.date_day && item.date_time
    const isCompleted = item.completed
    const displayInfo = getActivityDisplayInfo(item.activity_type)

    let countdownTs = null
    if (isFinalizedWithDateTime) {
      countdownTs = getEventDateTime(item)
    }

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isInvite && styles.inviteCard,
          index === 0 && styles.firstCard,
          index === displayedActivities.length - 1 && styles.lastCard
        ]}
        onPress={() => {
          if (Haptics?.impactAsync) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
          navigation.navigate('ActivityDetails', { activityId: item.id })
        }}
        activeOpacity={0.9}
      >
        <View style={styles.hostTag}>
          <Users stroke="#fff" width={10} height={10} />
          <Text style={styles.tagText}>{firstName}</Text>
        </View>
        <View style={[
          styles.typeTag,
          isInvite && styles.inviteTag,
          isInvite && styles.centeredTag
        ]}>
          <Text style={styles.tagText}>
            {item.emoji} {displayInfo.displayText}
          </Text>
        </View>

        <View style={styles.cardContent}>
          {isInvite ? (
            <View style={styles.inviteContainer}>
              <View style={styles.inviteHeader}>
                <Mail stroke="#d394f5" width={16} height={16} />
                <Text style={styles.inviteLabel}>{firstName} invited you!</Text>
              </View>
              <Text style={styles.funMessage}>
                Have fun with the {displayInfo.emoji}
              </Text>
            </View>
          ) : countdownTs ? (
            <CountdownText targetTs={countdownTs} activityType={item.activity_type} />
          ) : isInProgress ? (
            <ProgressDisplay activity={item} />
          ) : isCompleted ? (
            <View style={styles.completedContainer}>
              <Text style={styles.completedLabel}>ACTIVITY COMPLETED</Text>
            </View>
          ) : (
            <View style={styles.placeholderContent}>
              <Text style={styles.activityTypeEmoji}>{item.emoji}</Text>
              <Text style={styles.activityTypeName}>
                {displayInfo.displayText}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle}>{item.activity_name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar stroke="#fff" width={12} height={12} />
              <Text style={styles.metaText}>{formatDate(item.date_day)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock stroke="#fff" width={12} height={12} />
              <Text style={styles.metaText}>{formatTime(item.date_time)}</Text>
            </View>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.viewLinkContainer}>
              <Text style={styles.viewLink}>
                {isInvite ? 'View invite' : isInProgress ? 'Continue planning' : 'View board'} →
              </Text>
            </View>
            <View style={styles.partCount}>
              <Text style={styles.partText}>{(item.participants?.length || 0) + 1} ppl</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const ListHeader = () => (
    <>
      <ProfileSnippet />
      
      <View style={styles.hero}>
        <TouchableOpacity 
          style={styles.startActivityButton}
          onPress={() => navigation.navigate('TripDashboardScreen')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonGlow} />
          <Plus stroke="#CF38DD" width={20} height={20} strokeWidth={2.5} style={styles.buttonIcon} />
          <Text style={styles.buttonTitle}>Start New Activity</Text>
          <Text style={styles.buttonSubtitle}>Make group decisions easy</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Bar */}
      <View style={styles.mainTabContainer}>
        <View style={styles.mainTabBar}>
          <TouchableOpacity
            style={[styles.mainTab, mainTab === 'Activities' && styles.mainTabActive]}
            onPress={() => {
              if (Haptics?.impactAsync) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              setMainTab('Activities')
            }}
            activeOpacity={0.7}
          >
            <Activity stroke={mainTab === 'Activities' ? '#fff' : '#B8A5C4'} width={18} height={18} strokeWidth={2.5} />
            <Text style={[styles.mainTabLabel, mainTab === 'Activities' && styles.mainTabLabelActive]}>
              Activities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTab, mainTab === 'Your Community' && styles.mainTabActive]}
            onPress={() => {
              if (Haptics?.impactAsync) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              setMainTab('Your Community')
            }}
            activeOpacity={0.7}
          >
            <Users stroke={mainTab === 'Your Community' ? '#fff' : '#B8A5C4'} width={18} height={18} strokeWidth={2.5} />
            <Text style={[styles.mainTabLabel, mainTab === 'Your Community' && styles.mainTabLabelActive]}>
              Your Community
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity Filters - Only show when Activities tab is active */}
      {mainTab === 'Activities' && (
        <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          {FILTERS.map((filterItem) => {
            const count = filterItem.key === 'Invites' ? invites.length : 0
            const isActive = filter === filterItem.key
            return (
              <ModernTab
                key={filterItem.key}
                filter={filterItem}
                isActive={isActive}
                onPress={() => {
                  setFilter(filterItem.key)
                  setShowAllPast(false)
                }}
                count={count}
              />
            )
          })}
        </View>
      </View>
      )}

      {/* Only show empty state for activities tab */}
      {mainTab === 'Activities' && filteredActivities.length === 0 && filter !== 'Invites' && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📱</Text>
          <Text style={styles.empty}>No activities to show.</Text>
          <Text style={styles.emptySub}>
            Start by creating your first activity!
          </Text>
        </View>
      )}
    </>
  )

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      {mainTab === 'Activities' && filter === 'Past' && filteredActivities.length > PREVIEW_PAST && (
        <TouchableOpacity
          style={styles.showMore}
          onPress={() => {
            if (Haptics?.impactAsync) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            setShowAllPast(v => !v)
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.showMoreText}>
            {showAllPast ? 'Show Less' : `Show ${filteredActivities.length - PREVIEW_PAST} More`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
        <FlatList
          data={[]} // Empty array for header/footer only
          keyExtractor={() => 'dummy'}
          renderItem={() => null}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={() => (
            <>
              {mainTab === 'Activities' ? (
                <>
                  {/* Show activities section */}
                  <FlatList
                    data={displayedActivities}
                    keyExtractor={(item) => String(item.id)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={renderCard}
                    contentContainerStyle={styles.horizontalGrid}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    snapToInterval={296} // card width + margin (280 + 16)
                  />
                </>
              ) : (
                /* Show community section */
                <View style={styles.communityContainer}>
                  <YourCommunity />
                </View>
              )}
              <ListFooter />
            </>
          )}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
        <VoxxyFooter />
      </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#201925',
  },

  grid: {
    paddingVertical: CARD_MARGIN,
  },

  horizontalGrid: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: CARD_MARGIN,
    paddingBottom: 32,
  },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },

  startActivityButton: {
    backgroundColor: 'rgba(42, 30, 46, 0.8)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(207, 56, 221, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },

  buttonGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(207, 56, 221, 0.3)',
    borderRadius: 50,
    opacity: 0.5,
  },

  buttonIcon: {
    marginBottom: 6,
  },

  buttonTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
    letterSpacing: 0.3,
  },

  buttonSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
  },

  // Main Tab Styles
  mainTabContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  mainTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(42, 30, 46, 0.8)',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.3)',
    shadowColor: 'rgba(185, 84, 236, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  mainTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  mainTabActive: {
    backgroundColor: '#CF38DD',
    shadowColor: 'rgba(207, 56, 221, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  mainTabLabel: {
    color: '#B8A5C4',
    fontSize: 14,
    fontWeight: '600',
  },

  mainTabLabelActive: {
    color: '#fff',
  },

  // Modern Tab Styles (Activity Filters)
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.2)',
    shadowColor: 'rgba(185, 84, 236, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  modernTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
  },

  modernTabActive: {
    backgroundColor: 'rgba(185, 84, 236, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.3)',
    shadowColor: 'rgba(185, 84, 236, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 4,
  },

  tabLabel: {
    color: '#B8A5C4',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  tabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },

  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#CF38DD',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#201925',
  },

  tabBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },

  // Create Card Styles
  createCard: {
    width: 280,
    height: 320,
    marginRight: 16,
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.4)',
    borderStyle: 'dashed',
    shadowColor: 'rgba(78, 205, 196, 0.3)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  invitesEmptyCard: {
    borderColor: 'rgba(211, 148, 245, 0.4)',
    shadowColor: 'rgba(211, 148, 245, 0.3)',
  },

  createCardGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    backgroundColor: 'rgba(78, 205, 196, 0.05)',
    borderRadius: 100,
  },

  invitesGlow: {
    backgroundColor: 'rgba(211, 148, 245, 0.05)',
  },

  createCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 16,
    zIndex: 1,
  },

  createIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: 'rgba(78, 205, 196, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  invitesIconContainer: {
    backgroundColor: 'rgba(211, 148, 245, 0.15)',
    borderColor: 'rgba(211, 148, 245, 0.4)',
    shadowColor: 'rgba(211, 148, 245, 0.4)',
  },

  createTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },

  createSubtitle: {
    color: '#B8A5C4',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },

  createSuggestions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },

  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  invitesEmptyIcon: {
    marginTop: 8,
  },

  invitesEmptyEmoji: {
    fontSize: 32,
  },

  createArrow: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },

  invitesArrow: {
    backgroundColor: 'rgba(211, 148, 245, 0.1)',
    borderColor: 'rgba(211, 148, 245, 0.3)',
  },

  createArrowText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  invitesArrowText: {
    color: '#d394f5',
  },

  card: {
    width: 280,
    height: 320,
    marginRight: 16,
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.5)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },

  firstCard: {
    marginLeft: 0,
  },

  lastCard: {
    marginRight: CARD_MARGIN,
  },

  inviteCard: {
    borderColor: 'rgba(211, 148, 245, 0.8)',
    borderWidth: 2,
    shadowColor: 'rgba(211, 148, 245, 0.4)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 18,
  },

  hostTag: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(185, 84, 236, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: 'rgba(185, 84, 236, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  typeTag: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(207, 56, 221, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: 'rgba(207, 56, 221, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  inviteTag: {
    backgroundColor: 'rgba(211, 148, 245, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: 'rgba(211, 148, 245, 0.5)',
    shadowRadius: 10,
  },

  tagText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.3,
  },

  cardContent: {
    flex: 1,
    marginTop: 50,
    marginBottom: 8,
  },

  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(207, 56, 221, 0.3)',
  },

  countdownLabel: {
    color: '#d394f5',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },

  countdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  countdownBlock: {
    alignItems: 'center',
    minWidth: 40,
  },

  countdownNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },

  countdownUnit: {
    color: '#d8cce2',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  progressOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(207, 56, 221, 0.3)',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },

  progressStage: {
    color: '#d394f5',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },

  progressBarContainer: {
    width: '90%',
    height: 12,
    backgroundColor: 'rgba(64, 51, 71, 0.8)',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(207, 56, 221, 0.4)',
    shadowColor: 'rgba(207, 56, 221, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#cf38dd',
    borderRadius: 5,
    shadowColor: 'rgba(207, 56, 221, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 12,
  },

  completedLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },

  inviteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(211, 148, 245, 0.4)',
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 16,
  },

  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  inviteLabel: {
    color: '#d394f5',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },

  funMessage: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  activityTypeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },

  activityTypeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  cardFooter: {
    padding: 24,
    backgroundColor: 'rgba(15, 15, 20, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(64, 51, 71, 0.3)',
  },

  cardTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 17,
    marginBottom: 12,
    lineHeight: 22,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    color: '#B8A5C4',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  viewLinkContainer: {
    flex: 1,
  },

  partCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  partText: {
    color: '#B8A5C4',
    fontSize: 12,
    fontWeight: '500',
  },

  viewLink: {
    color: '#cc31e8',
    fontSize: 12,
    fontWeight: '600',
  },

  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 24,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  empty: {
    color: '#B8A5C4',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },

  emptySub: {
    color: '#777',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },

  footerContainer: {
    paddingHorizontal: CARD_MARGIN,
    paddingBottom: 24,
  },

  communityContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  showMore: {
    alignSelf: 'center',
    marginVertical: 20,
    backgroundColor: 'rgba(207, 56, 221, 0.9)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(207, 56, 221, 0.6)',
    shadowColor: 'rgba(207, 56, 221, 0.5)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  showMoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.3,
  },
})