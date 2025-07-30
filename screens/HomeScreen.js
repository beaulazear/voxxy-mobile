import React, { useContext, useMemo, useState, useEffect, useRef } from 'react'
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
import { Users, HelpCircle, X, Plus, Zap, CheckCircle, BookOpen, Mail, Coffee, MapPin, Star, User, Activity, Hamburger, Martini, Dices } from 'lucide-react-native'
import CustomHeader from '../components/CustomHeader'
import YourCommunity from '../components/YourCommunity'
import ProfileSnippet from '../components/ProfileSnippet'
import { useNavigation } from '@react-navigation/native';
import PushNotificationService from '../services/PushNotificationService';
import { API_URL } from '../config';
import { Alert } from 'react-native';

const { width: screenWidth } = Dimensions.get('window')

const FULL_HEIGHT = 333

const FILTERS = [
  { key: 'In Progress', icon: Zap },
  { key: 'Finalized', icon: CheckCircle },
  { key: 'Invites', icon: Mail },
  { key: 'Favorites', icon: Star }
]

const PREVIEW_PAST = 3
const CARD_MARGIN = 12
const CARD_PADDING = 16

// Activity type configuration
const ACTIVITY_CONFIG = {
  'Restaurant': {
    displayText: 'Food',
    countdownText: 'Hope you and your crew savored every bite together! 🥂',
    countdownLabel: 'Meal Starts In',
    emoji: '🍜',
    icon: Hamburger,
    iconColor: '#FF6B6B'
  },
  'Game Night': {
    displayText: 'Game Night',
    countdownText: 'Dice rolled, friendships scored—your group leveled up the fun! 🏆',
    countdownLabel: 'Game Night Starts In',
    emoji: '🎮',
    icon: Dices,
    iconColor: '#A8E6CF'
  },
  'Cocktails': {
    displayText: 'Drinks',
    countdownText: 'Cheers to wild laughs and brighter memories—what a crew! 🥂',
    countdownLabel: 'Your Outing Starts In',
    emoji: '🍸',
    icon: Martini,
    iconColor: '#4ECDC4'
  }
}

// Helper function to get activity display info
function getActivityDisplayInfo(activityType) {
  return ACTIVITY_CONFIG[activityType] || {
    displayText: 'Lets Meet!',
    countdownText: 'ACTIVITY STARTED',
    countdownLabel: 'Activity Starts In',
    emoji: '🎉',
    icon: Activity,
    iconColor: '#B8A5C4'
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
        <Text style={styles.countdownCompleted}>
          Started!
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.countdownContainer}>
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
      </View>
    </View>
  )
}

function ProgressDisplay({ activity, currentUserId }) {
  // Check if current user is the host
  const isHost = activity.user_id === currentUserId
  
  // Check if current user has submitted a response (for non-hosts)
  const userResponse = activity.responses?.find(r => r.user_id === currentUserId)
  const hasUserResponded = !!userResponse
  
  return (
    <View style={styles.progressOverlay}>
      {/* Simple status message */}
      {isHost ? (
        <View style={styles.hostBadge}>
          <Users color="#B954EC" size={16} strokeWidth={2.5} />
          <Text style={styles.hostText}>Waiting for responses</Text>
        </View>
      ) : hasUserResponded ? (
        <View style={styles.bandContainer}>
          <View style={styles.bandBackground} />
          <View style={styles.respondedBadge}>
            <CheckCircle color="#4ECDC4" size={16} strokeWidth={2.5} />
            <Text style={styles.respondedText}>Preferences submitted!</Text>
          </View>
        </View>
      ) : (
        <View style={styles.bandContainer}>
          <View style={styles.bandBackgroundAction} />
          <View style={styles.actionNeededBadge}>
            <Zap color="#FFE66D" size={16} strokeWidth={2.5} />
            <Text style={styles.actionNeededText}>Action needed!</Text>
          </View>
        </View>
      )}
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
            <Mail color="#d394f5" size={28} strokeWidth={2.5} />
          ) : (
            <Plus color="#4ECDC4" size={28} strokeWidth={2.5} />
          )}
        </View>

        <Text style={styles.createTitle}>{title}</Text>
        <Text style={styles.createSubtitle}>{subtitle}</Text>

        {!isInvitesEmpty && (
          <View style={styles.createSuggestions}>
            <View style={styles.suggestionIcon}>
              <Hamburger color="#FF6B6B" size={18} strokeWidth={2} />
            </View>
            <View style={styles.suggestionIcon}>
              <Star color="#4ECDC4" size={18} strokeWidth={2} />
            </View>
            <View style={styles.suggestionIcon}>
              <MapPin color="#FFE66D" size={18} strokeWidth={2} />
            </View>
            <View style={styles.suggestionIcon}>
              <User color="#A8E6CF" size={18} strokeWidth={2} />
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
function ModernTab({ filter, isActive, onPress }) {
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
      <IconComponent
        color={isActive ? '#fff' : '#B8A5C4'}
        size={18}
        strokeWidth={isActive ? 2.5 : 2}
      />
    </TouchableOpacity>
  )
}


export default function HomeScreen() {
  const { user } = useContext(UserContext)
  const navigation = useNavigation()
  const [mainTab, setMainTab] = useState('Activities')
  const [filter, setFilter] = useState('In Progress')
  const [showAllPast, setShowAllPast] = useState(false)
  const scrollY = useRef(new Animated.Value(0)).current
  const scrollRef = useRef(null)

  const scrollToTop = () => {
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true })
  }

  const activities = useMemo(() => {
    if (!user) return []
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
      setFilter('In Progress')
    }
  }, [invites.length, inProgress.length, finalized.length])

  if (user && !user.confirmed_at) {
    return <AccountCreatedScreen />
  }

  const filteredActivities = (() => {
    const dataMap = {
      'In Progress': inProgress,
      'Finalized': finalized,
      'Invites': invites,
      'Favorites': [], // Placeholder - empty array for now
    }

    const data = dataMap[filter] || []

    return data.sort((a, b) => {
      // For in-progress activities, prioritize action needed items
      if (filter === 'In Progress') {
        const aUserResponse = a.responses?.find(r => r.user_id === user?.id)
        const bUserResponse = b.responses?.find(r => r.user_id === user?.id)
        const aIsHost = a.user_id === user?.id
        const bIsHost = b.user_id === user?.id
        
        const aActionNeeded = !aIsHost && !aUserResponse
        const bActionNeeded = !bIsHost && !bUserResponse
        
        // Action needed items come first
        if (aActionNeeded && !bActionNeeded) return -1
        if (!aActionNeeded && bActionNeeded) return 1
      }
      
      // Then sort by date
      const dateA = new Date(a.date_day || '9999-12-31')
      const dateB = new Date(b.date_day || '9999-12-31')
      return dateA - dateB // Soonest first for upcoming activities
    })
  })()

  const displayedActivities = filteredActivities

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
        {/* Header with icon and activity type */}
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            {displayInfo.icon && (
              <displayInfo.icon 
                color={displayInfo.iconColor} 
                size={20} 
                strokeWidth={2}
              />
            )}
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardType}>{displayInfo.displayText}</Text>
            <Text style={styles.cardHost}>by {firstName}</Text>
          </View>
        </View>

        {/* Status/Content Area */}
        <View style={styles.cardStatusArea}>
          {isInvite ? (
            <View style={styles.overlayStatusContainer}>
              <Mail color="#d394f5" size={14} />
              <Text style={styles.overlayStatusText}>Invitation</Text>
            </View>
          ) : countdownTs ? (
            <CountdownText targetTs={countdownTs} activityType={item.activity_type} />
          ) : isInProgress ? (
            <ProgressDisplay activity={item} currentUserId={user?.id} />
          ) : isCompleted ? (
            <View style={styles.overlayStatusContainer}>
              <Text style={styles.overlayStatusText}>Completed</Text>
            </View>
          ) : (
            <View style={styles.overlayStatusContainer}>
              <Text style={styles.overlayStatusText}>Planning...</Text>
            </View>
          )}
        </View>

        {/* Activity Name */}
        <View style={styles.cardTitleArea}>
          <Text style={styles.cardTitle} numberOfLines={3} ellipsizeMode="tail">
            {item.activity_name}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const ListHeader = () => (
    <>
      <View style={{ height: 300 }} />
      
      {/* Dynamic Header */}
      <View style={styles.dynamicHeaderContainer}>
        <Text style={styles.dynamicHeaderTitle}>
          {mainTab === 'Activities' ? 'Activities' : 'Community'}
        </Text>
        <Text style={styles.dynamicHeaderSubtitle}>
          {mainTab === 'Activities' 
            ? 'Your planned adventures and experiences'
            : 'Your Voxxy crew and activity partners'
          }
        </Text>
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
            <Activity color={mainTab === 'Activities' ? '#fff' : '#B8A5C4'} size={18} strokeWidth={2.5} />
            <Text style={[styles.mainTabLabel, mainTab === 'Activities' && styles.mainTabLabelActive]}>
              Activities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTab, mainTab === 'Community' && styles.mainTabActive]}
            onPress={() => {
              if (Haptics?.impactAsync) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              setMainTab('Community')
            }}
            activeOpacity={0.7}
          >
            <Users color={mainTab === 'Community' ? '#fff' : '#B8A5C4'} size={18} strokeWidth={2.5} />
            <Text style={[styles.mainTabLabel, mainTab === 'Community' && styles.mainTabLabelActive]}>
              Community
            </Text>
          </TouchableOpacity>
        </View>
      </View>


    </>
  )

  const ListFooter = () => (
    <View style={styles.footerContainer}>
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ProfileSnippet scrollY={scrollY} onScrollToTop={scrollToTop} />
      <Animated.FlatList
        ref={scrollRef}
        data={[]} // Empty array for header/footer only
        keyExtractor={() => 'dummy'}
        renderItem={() => null}
        ListHeaderComponent={ListHeader}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListFooterComponent={() => (
          <>
            {mainTab === 'Activities' ? (
              <>
                {/* Activities section with side filters */}
                <View style={styles.activitiesWithFilters}>
                  {/* Side Filter Buttons */}
                  <View style={styles.sideFilters}>
                    {FILTERS.map((filterItem) => {
                      const isActive = filter === filterItem.key
                      const IconComponent = filterItem.icon
                      const count = filterItem.key === 'Invites' ? invites.length : 0
                      return (
                        <TouchableOpacity
                          key={filterItem.key}
                          style={[
                            styles.sideFilterButton,
                            isActive && styles.sideFilterButtonActive
                          ]}
                          onPress={() => {
                            if (Haptics?.impactAsync) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            }
                            setFilter(filterItem.key)
                            setShowAllPast(false)
                          }}
                          activeOpacity={0.7}
                        >
                          <IconComponent
                            stroke={isActive ? '#fff' : '#B8A5C4'}
                            width={14}
                            height={14}
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                          {filterItem.key === 'Invites' && count > 0 && (
                            <View style={styles.sideFilterBadge}>
                              <Text style={styles.sideFilterBadgeText}>{count}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                    
                    {/* Plus button to create new activity */}
                    <TouchableOpacity
                      style={styles.sideCreateButton}
                      onPress={() => {
                        if (Haptics?.impactAsync) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        }
                        navigation.navigate('TripDashboardScreen')
                      }}
                      activeOpacity={0.7}
                    >
                      <Plus
                        color='#4ECDC4'
                        size={14}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Horizontal Activities List or Empty State */}
                  {filteredActivities.length === 0 ? (
                    <View style={styles.sideEmptyContainer}>
                      {filter === 'Invites' ? (
                        <>
                          <Text style={styles.sideEmptyIcon}>💌</Text>
                          <Text style={styles.sideEmpty}>No invites to show</Text>
                          <Text style={styles.sideEmptySub}>
                            Invites will appear here!
                          </Text>
                        </>
                      ) : filter === 'Favorites' ? (
                        <>
                          <Text style={styles.sideEmptyIcon}>⭐</Text>
                          <Text style={styles.sideEmpty}>No favorites yet</Text>
                          <Text style={styles.sideEmptySub}>
                            Mark activities as favorites to see them here!
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.sideEmptyIcon}>📱</Text>
                          <Text style={styles.sideEmpty}>No activities to show</Text>
                          <Text style={styles.sideEmptySub}>
                            Start by creating your first activity!
                          </Text>
                        </>
                      )}
                    </View>
                  ) : (
                    <FlatList
                      data={displayedActivities}
                      keyExtractor={(item) => String(item.id)}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      renderItem={renderCard}
                      contentContainerStyle={styles.horizontalGrid}
                      snapToAlignment="start"
                      decelerationRate="fast"
                      snapToInterval={176} // card width + margin (160 + 16)
                    />
                  )}
                </View>
                
                {/* Start New Activity Button - Wide Version */}
                <View style={styles.wideButtonContainer}>
                  <TouchableOpacity
                    style={styles.wideStartActivityButton}
                    onPress={() => {
                      if (Haptics?.impactAsync) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                      }
                      navigation.navigate('TripDashboardScreen')
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.wideButtonGlow} />
                    
                    <View style={styles.wideButtonContent}>
                      <View style={styles.wideButtonIconContainer}>
                        <Plus color="#4ECDC4" size={28} strokeWidth={2.5} />
                      </View>

                      <Text style={styles.wideButtonTitle}>Start New Activity</Text>
                      <Text style={styles.wideButtonSubtitle}>Start planning something amazing!</Text>

                      <View style={styles.wideButtonSuggestions}>
                        <View style={styles.wideSuggestionIcon}>
                          <Hamburger color="#FF6B6B" size={18} strokeWidth={2} />
                        </View>
                        <View style={styles.wideSuggestionIcon}>
                          <Star color="#4ECDC4" size={18} strokeWidth={2} />
                        </View>
                        <View style={styles.wideSuggestionIcon}>
                          <MapPin color="#FFE66D" size={18} strokeWidth={2} />
                        </View>
                        <View style={styles.wideSuggestionIcon}>
                          <User color="#A8E6CF" size={18} strokeWidth={2} />
                        </View>
                      </View>

                      <View style={styles.wideButtonArrow}>
                        <Text style={styles.wideButtonArrowText}>Tap to start →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Show community section */
              <View style={styles.communityContainer}>
                <YourCommunity onCreateBoard={() => navigation.navigate('TripDashboardScreen')} />
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

  // Dynamic Header Styles (above tabs)
  dynamicHeaderContainer: {
    paddingHorizontal: 24,
    paddingTop: 2,
    paddingBottom: 12,
    alignItems: 'center',
  },

  dynamicHeaderTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },

  dynamicHeaderSubtitle: {
    color: '#B8A5C4',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },


  horizontalGrid: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 8,
  },

  // Activities with filters layout
  activitiesWithFilters: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 180, // Match card height
  },

  // Side filter buttons
  sideFilters: {
    paddingLeft: 8,
    paddingTop: 0,
    paddingRight: 4,
    gap: 6,
    justifyContent: 'center',
  },

  sideFilterButton: {
    width: 28,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(185, 84, 236, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  sideFilterButtonActive: {
    backgroundColor: 'rgba(185, 84, 236, 0.2)',
    borderColor: 'rgba(185, 84, 236, 0.4)',
    shadowColor: 'rgba(185, 84, 236, 0.3)',
    shadowRadius: 6,
  },

  sideFilterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#CF38DD',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#201925',
  },

  sideFilterBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },

  sideCreateButton: {
    width: 28,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(78, 205, 196, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    marginTop: 4,
  },

  // Side empty state (positioned to the right of buttons)
  sideEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
    minHeight: 180, // Match card height
  },

  sideEmptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },

  sideEmpty: {
    color: '#B8A5C4',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },

  sideEmptySub: {
    color: '#777',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
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
    marginBottom: 8,
    marginTop: -8,
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



  // Create Card Styles
  createCard: {
    width: 160,
    height: 180,
    marginRight: 16,
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 20,
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
    width: 160,
    height: 180,
    marginRight: 16,
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.5)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
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

  // New compact card header styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
    gap: 10,
  },

  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardHeaderInfo: {
    flex: 1,
  },

  cardType: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },

  cardHost: {
    color: '#B8A5C4',
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },

  // Status area for different card states
  cardStatusArea: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 60,
    overflow: 'visible',
  },


  // Card title area
  cardTitleArea: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    flex: 0,
    justifyContent: 'flex-end',
  },


  // Overlay status container (no borders, sits on wrapper background)
  overlayStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },

  overlayStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  countdownContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  countdownLabel: {
    color: '#d394f5',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },

  countdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  countdownBlock: {
    alignItems: 'center',
    minWidth: 30,
  },

  countdownNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },

  countdownUnit: {
    color: '#d8cce2',
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  countdownCompleted: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  progressOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    justifyContent: 'center',
  },

  respondedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  actionNeededBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    justifyContent: 'center',
  },

  actionNeededText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    justifyContent: 'center',
  },

  hostText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Band decoration styles
  bandContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  // Band background for "preferences submitted" (green/teal theme)
  bandBackground: {
    position: 'absolute',
    left: -16,
    right: -16,
    height: 32,
    backgroundColor: 'rgba(78, 205, 196, 0.25)',
    borderRadius: 16,
    shadowColor: 'rgba(78, 205, 196, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  // Band background for "action needed" (yellow theme)
  bandBackgroundAction: {
    position: 'absolute',
    left: -16,
    right: -16,
    height: 32,
    backgroundColor: 'rgba(255, 230, 109, 0.25)',
    borderRadius: 16,
    shadowColor: 'rgba(255, 230, 109, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  cardTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'left',
    letterSpacing: -0.2,
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

  // Wide Start Activity Button Styles
  wideButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 36,
  },

  wideStartActivityButton: {
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
    position: 'relative',
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },

  wideButtonGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    backgroundColor: 'rgba(78, 205, 196, 0.05)',
    borderRadius: 100,
  },

  wideButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 16,
    zIndex: 1,
  },

  wideButtonIconContainer: {
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

  wideButtonTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'Montserrat_700Bold',
  },

  wideButtonSubtitle: {
    color: '#B8A5C4',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },

  wideButtonSuggestions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },

  wideSuggestionIcon: {
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

  wideButtonArrow: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },

  wideButtonArrowText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
})