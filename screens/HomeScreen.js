import React, { useContext, useMemo, useState, useEffect } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
  Alert,
  Modal,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import AccountCreatedScreen from './AccountCreatedScreen'
import VoxxyFooter from '../components/VoxxyFooter'
import { Users, Calendar, Clock, HelpCircle, X } from 'react-native-feather'
import CustomHeader from '../components/CustomHeader'
import YourCommunity from '../components/YourCommunity'

const FILTERS = ['In Progress', 'Finalized', 'Past', 'Invites']
const PREVIEW_PAST = 3
const CARD_MARGIN = 12
const CARD_PADDING = 16

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

  if (countdown.days === 0 && countdown.hrs === 0 && countdown.mins === 0 && countdown.secs === 0) {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>
          {activityType === 'Meeting' ? 'MEETING STARTED' : 'ACTIVITY STARTED'}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.countdownLabel}>
        {activityType === 'Meeting' ? 'Meeting Starts In' : 'Activity Starts In'}
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
    stageDisplay = activity.activity_type === 'Meeting' ? 'Ready to Meet' : 'Ready to Go'
    progress = 100
  } else if (ideas > 0) {
    stage = 'voting'
    stageDisplay = 'Voting Phase'
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

function HelpModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.helpOverlay} onPress={onClose}>
        <View style={styles.helpModal}>
          <View style={styles.helpHeader}>
            <Text style={styles.helpTitle}>How to use this page</Text>
            <TouchableOpacity onPress={onClose}>
              <X stroke="#fff" width={20} height={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.helpContent}>
            <View style={styles.helpItem}>
              <Text style={styles.helpItemTitle}>✨ Create a New Board</Text>
              <Text style={styles.helpItemText}>Kick things off by clicking "Create Board" to start planning your next adventure.</Text>
            </View>
            <View style={styles.helpItem}>
              <Text style={styles.helpItemTitle}>📩 Accept Invitations</Text>
              <Text style={styles.helpItemText}>See a board you've been invited to? Join in and start collaborating with your crew.</Text>
            </View>
            <View style={styles.helpItem}>
              <Text style={styles.helpItemTitle}>🕰 Revisit Past Boards</Text>
              <Text style={styles.helpItemText}>Scroll through your finalized activities to relive the moments or get inspo for what's next.</Text>
            </View>
            <View style={styles.helpItem}>
              <Text style={styles.helpItemTitle}>🎭 Meet Your Voxxy Crew</Text>
              <Text style={styles.helpItemText}>Tap into your community! The "Voxxy Crew" section shows everyone you've planned with before.</Text>
            </View>
            <View style={styles.helpItem}>
              <Text style={styles.helpItemTitle}>⚙️ Edit Your Profile & Get Help</Text>
              <Text style={styles.helpItemText}>Need to update your info or ask a question? Use the top-right nav bar to visit your profile or the Help Center.</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

export default function HomeScreen() {
  const { user } = useContext(UserContext)
  const [filter, setFilter] = useState('In Progress')
  const [showAllPast, setShowAllPast] = useState(false)
  const [helpVisible, setHelpVisible] = useState(false)

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

  // Auto-set filter based on available content
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
      >
        {/* Tags */}
        <View style={[styles.hostTag, isInvite && styles.inviteTag]}>
          <Users stroke="#fff" width={10} height={10} />
          <Text style={styles.tagText}>{firstName}</Text>
        </View>
        <View style={[styles.typeTag, isInvite && styles.inviteTag]}>
          <Text style={styles.tagText}>
            {item.emoji} {item.activity_type === 'Restaurant' ? 'Lets Eat!' : 'Lets Meet!'}
          </Text>
        </View>

        {/* Invite Badge */}
        {isInvite && (
          <View style={styles.inviteBadge}>
            <Text style={styles.inviteBadgeText}>🎉 PENDING INVITE 🎉</Text>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.cardContent}>
          {countdownTs ? (
            <CountdownText targetTs={countdownTs} activityType={item.activity_type} />
          ) : isInProgress ? (
            <ProgressDisplay activity={item} />
          ) : (
            <View style={styles.placeholderContent}>
              <Text style={styles.activityTypeEmoji}>{item.emoji}</Text>
              <Text style={styles.activityTypeName}>
                {item.activity_type === 'Restaurant' ? 'Lets Eat!' : 'Lets Meet!'}
              </Text>
            </View>
          )}
        </View>

        {/* Card Footer */}
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
            <TouchableOpacity onPress={() => Linking.openURL(`https://www.voxxyai.com/login`)}>
              <Text style={styles.viewLink}>
                {isInvite ? 'View invite' : isInProgress ? 'Continue planning' : 'View board'} →
              </Text>
            </TouchableOpacity>
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
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Welcome back, {user.name}! 👋</Text>
          <Text style={styles.heroSub}>What are you planning today?</Text>
        </View>
        <TouchableOpacity style={styles.helpButton} onPress={() => setHelpVisible(true)}>
          <HelpCircle stroke="#fff" width={24} height={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[{ key: 'new' }, ...FILTERS.map(f => ({ key: f }))]}
        horizontal
        keyExtractor={item => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: CARD_MARGIN }}
        renderItem={({ item }) => {
          if (item.key === 'new') {
            return (
              <TouchableOpacity style={styles.newBtn} onPress={() => {/* create logic */ }}>
                <Text style={styles.newBtnText}>+ New</Text>
              </TouchableOpacity>
            )
          }

          const isActive = filter === item.key
          const count = item.key === 'Invites' ? invites.length : filteredActivities?.length || 0

          return (
            <TouchableOpacity
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                setFilter(item.key)
                setShowAllPast(false)
              }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {item.key}{item.key === 'Invites' && count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      {filteredActivities.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>
            {filter === 'Invites' ? 'No pending invites!' : 'No activities to show.'}
          </Text>
        </View>
      )}
    </>
  )

  const ListFooter = () => (
    <View style={styles.footerContainer}>
      {filter === 'Past' && filteredActivities.length > PREVIEW_PAST && (
        <TouchableOpacity
          style={styles.showMore}
          onPress={() => setShowAllPast(v => !v)}
        >
          <Text style={styles.showMoreText}>
            {showAllPast ? 'Show Less' : `Show ${filteredActivities.length - PREVIEW_PAST} More`}
          </Text>
        </TouchableOpacity>
      )}
      <YourCommunity />
    </View>
  )

  return (
    <>
      <CustomHeader />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <FlatList
          data={[]} // Empty array for header/footer only
          keyExtractor={() => 'dummy'}
          renderItem={() => null}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={() => (
            <>
              {filteredActivities.length > 0 && (
                <FlatList
                  data={displayedActivities}
                  keyExtractor={i => String(i.id)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={renderCard}
                  contentContainerStyle={styles.horizontalGrid}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  snapToInterval={296} // card width + margin (280 + 16)
                />
              )}
              <ListFooter />
            </>
          )}
          contentContainerStyle={styles.grid}
        />
        <VoxxyFooter />
        <HelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
      </SafeAreaView>
    </>
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
    paddingVertical: CARD_MARGIN,
  },

  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
  },

  heroContent: {
    flex: 1,
  },

  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },

  heroSub: {
    color: '#ccc',
    marginTop: 8,
    fontSize: 16,
  },

  helpButton: {
    padding: 8,
  },

  newBtn: {
    backgroundColor: '#1f7a8c',
    padding: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },

  newBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  tab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },

  tabActive: {
    backgroundColor: '#b931d6',
  },

  tabText: {
    color: '#ccc',
    fontWeight: '600',
  },

  tabTextActive: {
    color: '#fff',
  },

  card: {
    width: 280,
    height: 300,
    marginRight: 16,
    backgroundColor: 'rgba(42, 30, 46, 0.8)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },

  firstCard: {
    marginLeft: 0,
  },

  lastCard: {
    marginRight: CARD_MARGIN,
  },

  inviteCard: {
    borderColor: 'rgba(211, 148, 245, 0.6)',
    borderWidth: 2,
    shadowColor: 'rgba(211, 148, 245, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  hostTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(185, 84, 236, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 240, 245, 0.3)',
    shadowColor: 'rgba(185, 84, 236, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  typeTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(207, 56, 221, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 240, 245, 0.3)',
    shadowColor: 'rgba(207, 56, 221, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  inviteTag: {
    backgroundColor: 'rgba(211, 148, 245, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: 'rgba(211, 148, 245, 0.6)',
    shadowRadius: 6,
  },

  inviteBadge: {
    position: 'absolute',
    top: 46,
    left: 12,
    backgroundColor: 'rgba(207, 56, 221, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: 'rgba(207, 56, 221, 0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  inviteBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  tagText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  cardContent: {
    flex: 1,
    marginTop: 32,
    marginBottom: 8,
  },

  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
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
    gap: 16,
  },

  countdownBlock: {
    alignItems: 'center',
    minWidth: 50,
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
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(207, 56, 221, 0.3)',
    paddingVertical: 16,
    paddingHorizontal: 20,
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

  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activityTypeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },

  activityTypeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  cardFooter: {
    padding: 16,
    backgroundColor: 'rgba(15, 15, 20, 0.9)',
  },

  cardTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 16,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  partCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  partText: {
    color: '#ccc',
    fontSize: 12,
  },

  viewLink: {
    color: '#cc31e8',
    fontSize: 12,
    fontWeight: '600',
  },

  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },

  empty: {
    color: '#777',
    textAlign: 'center',
    fontSize: 16,
  },

  footerContainer: {
    paddingHorizontal: CARD_MARGIN,
  },

  showMore: {
    alignSelf: 'center',
    marginVertical: CARD_MARGIN,
    backgroundColor: 'rgba(207, 56, 221, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(207, 56, 221, 0.6)',
    shadowColor: 'rgba(207, 56, 221, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  showMoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Help Modal Styles
  helpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  helpModal: {
    backgroundColor: '#2C1E33',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },

  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  helpTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  helpContent: {
    maxHeight: 400,
  },

  helpItem: {
    marginBottom: 16,
  },

  helpItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  helpItemText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
})