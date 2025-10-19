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
  Animated,
  Dimensions,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { UserContext } from '../context/UserContext'
import AccountCreatedScreen from './AccountCreatedScreen'
import VoxxyFooter from '../components/VoxxyFooter'
import { Users, Zap, CheckCircle, Mail, Coffee, Activity, Hamburger, Martini } from 'lucide-react-native'
import ProfileSnippet from '../components/ProfileSnippet'
import { useNavigation } from '@react-navigation/native'
import UnifiedActivityChat from '../components/UnifiedActivityChat'
import { logger } from '../utils/logger'
import { API_URL } from '../config'
import { getUserDisplayImage } from '../utils/avatarManager'

const { width: screenWidth } = Dimensions.get('window')

const HEADER_HEIGHT = 60 // Matches ProfileSnippet height
const HEADER_SPACING = 16 // Space between ProfileSnippet and content

const PREVIEW_PAST = 3
const CARD_MARGIN = 12
const CARD_PADDING = 16

const ACTIVITY_CONFIG = {
  'Restaurant': {
    displayText: 'Restaurant',
    countdownText: 'Hope you and your crew savored every bite together! 🥂',
    countdownLabel: 'Meal Starts In',
    emoji: '🍜',
    icon: Hamburger,
    iconColor: '#FF6B6B'
  },
  'Cocktails': {
    displayText: 'Bar',
    countdownText: 'Cheers to wild laughs and brighter memories—what a crew! 🥂',
    countdownLabel: 'Your Outing Starts In',
    emoji: '🍸',
    icon: Martini,
    iconColor: '#4ECDC4'
  },
  // Legacy support for existing activities
  'Brunch': {
    displayText: 'Brunch',
    countdownText: 'Mimosas, pancakes, and perfect company—what a morning! 🥂',
    countdownLabel: 'Brunch Starts In',
    emoji: '☕',
    icon: Coffee,
    iconColor: '#FFA500'
  },
  'Game Night': {
    displayText: 'Game Night',
    countdownText: 'Dice rolled, friendships scored—your group leveled up the fun! 🏆',
    countdownLabel: 'Game Night Starts In',
    emoji: '🎮',
    icon: Coffee, // Using Coffee as fallback since Dices was removed
    iconColor: '#A8E6CF'
  }
}

// Helper function to get activity display info
function getActivityDisplayInfo(activityType) {
  return ACTIVITY_CONFIG[activityType] || {
    displayText: 'Meetup',
    countdownText: 'Hope you had a great time!',
    countdownLabel: 'Meetup Starts In',
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

// Floating Icon Component
function FloatingIcon({ icon: Icon, color, delay = 0, duration = 3000 }) {
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(translateY, {
            toValue: -20,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      <Icon color={color} size={20} strokeWidth={2} />
    </Animated.View>
  )
}

// Animated Start New Activity Wide Button
function AnimatedStartNewActivityButton({ navigation, onPress, userName, communityMembers = [], hasIncompleteProfile = false }) {
  // Background gradient animation
  const gradientAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Cycling icons for dining options
  const activityIcons = [
    { component: Hamburger, color: '#FF6B6B', name: 'restaurant', label: 'Restaurants' },
    { component: Martini, color: '#4ECDC4', name: 'bar', label: 'Bars & Lounges' }
  ]

  const [currentIconIndex, setCurrentIconIndex] = useState(0)
  const CurrentIcon = activityIcons[currentIconIndex].component

  // Get first name only
  const firstName = userName ? userName.split(' ')[0] : 'there'

  // Check if user has an established community (3+ members)
  const hasEstablishedCommunity = communityMembers.length >= 3

  // Start animations
  useEffect(() => {
    // Gradient shimmer animation
    const gradientAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    )

    // Subtle pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    )

    gradientAnimation.start()
    pulseAnimation.start()

    // Icon cycling every 4 seconds
    const iconInterval = setInterval(() => {
      setCurrentIconIndex((prev) => (prev + 1) % activityIcons.length)
    }, 4000)

    return () => {
      gradientAnimation.stop()
      pulseAnimation.stop()
      clearInterval(iconInterval)
    }
  }, [])

  return (
    <View style={styles.fullScreenCTAContainer}>
      {/* Floating decorative icons */}
      <View style={styles.floatingIconTopLeft}>
        <FloatingIcon icon={Hamburger} color="#FF6B6B" delay={0} duration={3000} />
      </View>
      <View style={styles.floatingIconTopRight}>
        <FloatingIcon icon={Martini} color="#4ECDC4" delay={500} duration={3500} />
      </View>
      <View style={styles.floatingIconBottomLeft}>
        <FloatingIcon icon={Coffee} color="#FFA500" delay={1000} duration={4000} />
      </View>
      <View style={styles.floatingIconBottomRight}>
        <FloatingIcon icon={Users} color="#B954EC" delay={1500} duration={3200} />
      </View>

      {/* Main CTA */}
      <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.wideStartActivityButton,
            hasIncompleteProfile && styles.wideStartActivityButtonCompact
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onPress()
          }}
          activeOpacity={0.85}
        >
          {/* Animated Gradient Border */}
          <LinearGradient
            colors={['#cc31e8', '#667eea', '#cc31e8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.wideButtonGradientBorder}
          >
            <View style={styles.wideButtonInner}>
              <View style={[
                styles.wideButtonContent,
                hasIncompleteProfile && styles.wideButtonContentCompact
              ]}>
                {/* Main Icon with glow */}
                <View style={[
                  styles.wideButtonMainIconContainer,
                  hasIncompleteProfile && styles.wideButtonMainIconContainerCompact
                ]}>
                  <View style={[
                    styles.iconGlow,
                    hasIncompleteProfile && styles.iconGlowCompact
                  ]} />
                  <CurrentIcon color="#ffffff" size={hasIncompleteProfile ? 32 : 40} strokeWidth={2.5} />
                </View>

                {/* Combined greeting and title */}
                <View style={styles.titleContainer}>
                  <Text style={styles.wideButtonTitle}>
                    Hey {firstName} ✨
                  </Text>
                  <Text style={styles.wideButtonTitle}>
                    {hasEstablishedCommunity
                      ? 'Your community awaits.'
                      : 'Lets get started!'}
                  </Text>
                </View>

                <Text style={styles.wideButtonSubtitle}>
                  {hasEstablishedCommunity
                    ? 'Be the one to start the next plan!'
                    : `Discover amazing ${activityIcons[currentIconIndex].label.toLowerCase()} with friends`}
                </Text>

                {/* Activity type indicators OR Community member avatars */}
                {hasEstablishedCommunity ? (
                  <View style={styles.communityAvatarsContainer}>
                    {communityMembers.slice(0, 5).map((member, idx) => (
                      <Image
                        key={member.id || idx}
                        source={getUserDisplayImage(member, API_URL)}
                        style={[
                          styles.communityAvatar,
                          { marginLeft: idx === 0 ? 0 : -12 }
                        ]}
                      />
                    ))}
                    {communityMembers.length > 5 && (
                      <View style={[styles.communityAvatar, styles.communityAvatarCount, { marginLeft: -12 }]}>
                        <Text style={styles.communityAvatarCountText}>
                          +{communityMembers.length - 5}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.wideButtonMicroIcons}>
                    {activityIcons.map((icon, index) => {
                      const IconComponent = icon.component
                      const isActive = index === currentIconIndex
                      return (
                        <Animated.View
                          key={index}
                          style={[
                            styles.wideMicroIcon,
                            isActive && styles.wideMicroIconActive
                          ]}
                        >
                          <IconComponent
                            color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                            size={24}
                            strokeWidth={2}
                          />
                        </Animated.View>
                      )
                    })}
                  </View>
                )}

                {/* CTA Button */}
                <View style={styles.wideButtonCallToAction}>
                  <Zap color="#ffffff" size={20} strokeWidth={2.5} />
                  <Text style={styles.wideButtonActionText}>Let's Go!</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
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


export default function HomeScreen({ route }) {
  const { user } = useContext(UserContext)
  const navigation = useNavigation()
  const [showActivityCreation, setShowActivityCreation] = useState(false)

  // Check if we should open the unified chat from navigation params
  useEffect(() => {
    if (route?.params?.openChat) {
      setShowActivityCreation(true)
      // Clear the param so it doesn't reopen if user navigates back
      navigation.setParams({ openChat: undefined })
    }
  }, [route?.params?.openChat])

  // Handle activity creation completion
  const handleActivityCreated = (newActivityId) => {
    if (newActivityId) {
      setShowActivityCreation(false)
      navigation.navigate('ActivityDetails', { activityId: newActivityId })
    } else {
      setShowActivityCreation(false)
    }
  }

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    let completed = 0
    const total = 5

    if (user?.name) completed++
    if (user?.email) completed++
    if (user?.city && user?.state) completed++
    if (user?.favorite_food) completed++
    if (user?.preferences) completed++

    const percentage = (completed / total) * 100

    const missing = []
    if (!user?.city || !user?.state) missing.push('Set your location')
    if (!user?.favorite_food) missing.push('Add favorite foods')
    if (!user?.preferences) missing.push('Set dietary preferences')

    return { completed, total, percentage, missing }
  }, [user])

  const activities = useMemo(() => {
    if (!user) return []

    // Helper function to validate activity structure
    const isValidActivity = (activity) => {
      return activity && (
        activity.activity_type !== undefined ||
        activity.participants !== undefined ||
        activity.responses !== undefined ||
        activity.user_id !== undefined
      ) && !activity.email // User objects have email, activities don't
    }

    // Filter out invalid activities from user.activities
    const mine = (user?.activities || []).filter(isValidActivity)

    // Filter and validate participant activities
    const theirs = user?.participant_activities
      ?.filter(p => p.accepted && p.activity && isValidActivity(p.activity))
      .map(p => p.activity) || []

    return [...new Map([...mine, ...theirs].map(a => [a.id, a])).values()]
  }, [user])

  // Combine in-progress and finalized into one category
  const inProgress = activities.filter(a => !a.completed)
  const past = activities.filter(a => a.completed)
  const invites = user?.participant_activities
    ?.filter(p => {
      const isValidActivity = p.activity && (
        p.activity.activity_type !== undefined ||
        p.activity.participants !== undefined ||
        p.activity.responses !== undefined ||
        p.activity.user_id !== undefined
      ) && !p.activity.email
      return !p.accepted && isValidActivity
    })
    .map(p => p.activity) || []

  // Calculate unique community members from all activities
  const communityMembers = useMemo(() => {
    if (!user || !activities.length) return []

    const memberMap = new Map()

    activities.forEach(activity => {
      // Add activity host if not current user
      if (activity.user && activity.user.id !== user.id) {
        memberMap.set(activity.user.id, activity.user)
      }

      // Add all participants if not current user
      if (activity.participants) {
        activity.participants.forEach(participant => {
          if (participant.id !== user.id) {
            memberMap.set(participant.id, participant)
          }
        })
      }
    })

    return Array.from(memberMap.values())
  }, [user, activities])

  if (user && !user.confirmed_at) {
    return <AccountCreatedScreen />
  }

  // Active activities (in-progress + invites)
  const filteredActivities = (() => {
    const data = [...inProgress, ...invites]

    const sortedData = data.sort((a, b) => {
      // Prioritize action needed items
      const aUserResponse = a.responses?.find(r => r.user_id === user?.id)
      const bUserResponse = b.responses?.find(r => r.user_id === user?.id)
      const aIsHost = a.user_id === user?.id
      const bIsHost = b.user_id === user?.id

      const aActionNeeded = !aIsHost && !aUserResponse
      const bActionNeeded = !bIsHost && !bUserResponse

      // Action needed items come first
      if (aActionNeeded && !bActionNeeded) return -1
      if (!aActionNeeded && bActionNeeded) return 1

      // Sort by date_day (soonest first)
      const dateA = new Date(a.date_day || '9999-12-31')
      const dateB = new Date(b.date_day || '9999-12-31')
      return dateA - dateB
    })

    return sortedData
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



  function renderListItem({ item, index }) {
    const firstName = item.user?.name?.split(' ')[0] || ''
    const isInvite = invites.some(invite => invite.id === item.id)
    const isInProgress = !item.finalized && !item.completed && !isInvite
    const isFinalizedWithDateTime = item.finalized && item.date_day && item.date_time
    const isCompleted = item.completed
    const displayInfo = getActivityDisplayInfo(item.activity_type)
    const isUserHost = item.user?.id === user?.id
    
    // Debug logging for first list item
    if (index === 0) {
      logger.debug('DEBUG - First list item:', {
        itemUserId: item.user?.id,
        currentUserId: user?.id,
        userName: user?.name,
        isUserHost,
        itemName: item.activity_name
      })
    }

    let countdownTs = null
    if (isFinalizedWithDateTime) {
      countdownTs = getEventDateTime(item)
    }

    // Get status text and color
    let statusText = 'Planning...'
    let statusColor = '#B8A5C4'
    let statusIcon = Activity

    if (isInvite) {
      statusText = 'NEW INVITE'
      statusColor = '#d394f5'
      statusIcon = Mail
    } else if (isCompleted) {
      statusText = 'COMPLETED'
      statusColor = '#4ECDC4'
      statusIcon = CheckCircle
    } else if (countdownTs) {
      const timeLeft = Math.max(countdownTs - Date.now(), 0)
      const days = Math.floor(timeLeft / (24 * 3600000))
      const hrs = Math.floor((timeLeft % (24 * 3600000)) / 3600000)
      const mins = Math.floor((timeLeft % 3600000) / 60000)
      
      if (timeLeft <= 0) {
        statusText = 'STARTED'
        statusColor = '#4ECDC4'
      } else {
        statusText = `${days > 0 ? days + 'd ' : ''}${hrs}h ${mins}m`
        statusColor = '#FFE66D'
      }
    } else if (isInProgress) {
      const userResponse = item.responses?.find(r => r.user_id === user?.id)
      const isHost = item.user_id === user?.id
      
      if (isHost) {
        statusText = 'WAITING FOR RESPONSES'
        statusColor = '#B954EC'
        statusIcon = Users
      } else if (userResponse) {
        statusText = 'SUBMITTED'
        statusColor = '#4ECDC4'
        statusIcon = CheckCircle
      } else {
        statusText = 'ACTION NEEDED'
        statusColor = '#FFE66D'
        statusIcon = Zap
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          isInvite && styles.listItemInvite,
          isUserHost && styles.userOwnedListItem,
          index === 0 && styles.listItemFirst,
          index === displayedActivities.length - 1 && styles.listItemLast
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          navigation.navigate('ActivityDetails', { activityId: item.id })
        }}
        activeOpacity={0.7}
      >
        {/* Left: Activity Icon */}
        <View style={styles.listItemIcon}>
          {displayInfo.icon && (
            <displayInfo.icon 
              color={displayInfo.iconColor} 
              size={24} 
              strokeWidth={2.5}
            />
          )}
        </View>

        {/* Center: Activity Info */}
        <View style={styles.listItemContent}>
          <Text style={[
            styles.listItemTitle,
            !item.finalized && { color: 'rgba(255, 255, 255, 0.6)' }
          ]} numberOfLines={1}>
            {item.finalized
              ? item.activity_name
              : item.voting
                ? 'Choosing Venue'
                : 'Collecting'}
          </Text>
          <View style={styles.listItemMeta}>
            <Text style={styles.listItemType}>{displayInfo.displayText}</Text>
            <Text style={styles.listItemHost}>by {isUserHost ? 'you' : firstName}</Text>
            {item.finalized && item.date_day && (
              <Text style={styles.listItemDate}>{formatDate(item.date_day)}</Text>
            )}
          </View>
        </View>


        {/* Right: Status */}
        <View style={styles.listItemStatus}>
          {isInvite && statusIcon && (
            <View style={[styles.listItemStatusIcon, { backgroundColor: statusColor + '20' }]}>
              {React.createElement(statusIcon, { color: statusColor, size: 16, strokeWidth: 2.5 })}
            </View>
          )}
          <Text style={[
            styles.listItemStatusText, 
            { color: statusColor },
            isInvite && styles.listItemInviteStatusText
          ]}>
            {statusText}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const ListHeader = () => (
    <>
      <View style={{ height: HEADER_HEIGHT + HEADER_SPACING }} />
    </>
  )

  const ListFooter = () => (
    <View style={styles.footerContainer}>
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ProfileSnippet />
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        <ListHeader />

        {/* Profile Completion Notice */}
        {profileCompletion.percentage < 100 && (
          <TouchableOpacity
            style={styles.homeCompletionBanner}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={styles.homeCompletionHeader}>
              <Text style={styles.homeCompletionTitle}>
                Complete Your Profile
              </Text>
              <Text style={styles.homeCompletionSubtitle}>
                Get better recommendations!
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.homeCompletionBarContainer}>
              <View style={styles.homeCompletionBar}>
                <View
                  style={[
                    styles.homeCompletionFill,
                    { width: `${profileCompletion.percentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.homeCompletionPercentage}>
                {Math.round(profileCompletion.percentage)}%
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Animated Start New Activity Button - Wide Version */}
        <AnimatedStartNewActivityButton
          navigation={navigation}
          onPress={() => setShowActivityCreation(true)}
          userName={user?.name}
          communityMembers={communityMembers}
          hasIncompleteProfile={profileCompletion.percentage < 100}
        />
        <ListFooter />
      </ScrollView>
      <VoxxyFooter onPlusPress={() => setShowActivityCreation(true)} hasPendingInvites={invites.length > 0} />

      {/* Unified Activity Creation Modal */}
      <UnifiedActivityChat
        visible={showActivityCreation}
        onClose={handleActivityCreated}
      />

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
    paddingTop: 8,
  },

  // Top filter tabs layout
  topFiltersContainer: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 16,
    paddingBottom: 12,
  },

  topFiltersContent: {
    paddingRight: CARD_MARGIN,
    gap: 8,
  },

  topFilterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.2)',
    gap: 8,
    shadowColor: 'rgba(185, 84, 236, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  topFilterTabActive: {
    backgroundColor: 'rgba(185, 84, 236, 0.3)',
    borderColor: 'rgba(185, 84, 236, 0.5)',
    shadowColor: 'rgba(185, 84, 236, 0.3)',
  },

  topFilterTabText: {
    color: '#B8A5C4',
    fontSize: 14,
    fontWeight: '600',
  },

  topFilterTabTextActive: {
    color: '#fff',
  },

  topFilterBadge: {
    backgroundColor: '#6B46C1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  topFilterBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  topCreateTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    gap: 8,
    shadowColor: 'rgba(78, 205, 196, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  topCreateTabText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
  },

  // Activities container layout
  activitiesContainer: {
    flex: 1,
  },

  // Empty state container
  sideEmptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    minHeight: 220,
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




  // Animated Create Card Styles
  createCard: {
    width: 200,
    height: 220,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },

  invitesEmptyCard: {
    // Keep for compatibility but most styling is in gradient
  },

  createCardAnimatedGlow: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    backgroundColor: 'rgba(204, 49, 232, 0.15)',
    borderRadius: 50,
    zIndex: 0,
  },

  createCardGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 3,
    shadowColor: 'rgba(204, 49, 232, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
  },

  createCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },

  createMainIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  createTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Montserrat_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  createSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },

  createMicroIcons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },

  microIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  microIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ scale: 1.1 }],
  },

  createCallToAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 6,
  },

  createActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  createSparkle: {
    opacity: 0.9,
  },

  invitesEmptyIcon: {
    marginTop: 8,
  },

  invitesEmptyEmoji: {
    fontSize: 32,
  },

  invitesArrowText: {
    color: '#d394f5',
  },

  card: {
    width: 200,
    height: 220,
    marginRight: 16,
    backgroundColor: '#1a1420',
    borderRadius: 16,
    overflow: 'visible',
    borderWidth: 2,
    borderColor: 'rgba(185, 84, 236, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 20,
    position: 'relative',
  },
  favoriteCard: {
    borderColor: 'rgba(212, 175, 55, 0.6)',
    backgroundColor: '#1a1420',
    borderWidth: 2,
  },

  userOwnedCard: {
    borderColor: 'rgba(139, 92, 246, 0.6)',
    borderWidth: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.02)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  favoriteIndicator: {
    marginLeft: 'auto',
  },
  favoriteBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  favoriteBadgeText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardMetaText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginLeft: 4,
    flex: 1,
  },
  cardPrice: {
    color: '#28a745',
    fontSize: 12,
    fontWeight: '600',
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 18,
    backgroundColor: '#1a1420',
  },

  // New compact card header styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: 'rgba(185, 84, 236, 0.08)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(185, 84, 236, 0.15)',
  },

  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  cardHeaderInfo: {
    flex: 1,
  },

  cardType: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  cardHost: {
    color: '#9B7FA6',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.9,
    fontStyle: 'italic',
  },

  // Status area for different card states
  cardStatusArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    minHeight: 80,
    overflow: 'visible',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },


  // Card title area
  cardTitleArea: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 8,
    flex: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(185, 84, 236, 0.05)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(185, 84, 236, 0.1)',
    minHeight: 50,
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
    fontSize: 13,
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
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },

  countdownUnit: {
    color: '#d8cce2',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  countdownCompleted: {
    color: '#4ECDC4',
    fontSize: 18,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: 'Montserrat_700Bold',
    textShadowColor: 'rgba(185, 84, 236, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Card corner decorations
  cardCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: 'rgba(185, 84, 236, 0.4)',
    borderWidth: 2,
    zIndex: 10,
  },

  cardCornerTopLeft: {
    top: -1,
    left: -1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },

  cardCornerTopRight: {
    top: -1,
    right: -1,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },

  cardCornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },

  cardCornerBottomRight: {
    bottom: -1,
    right: -1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },

  // Favorite card corner style
  favoriteCorner: {
    borderColor: 'rgba(212, 175, 55, 0.6)',
    borderWidth: 2,
  },

  // Activity card corner style
  activityCorner: {
    borderColor: 'rgba(185, 84, 236, 0.4)',
    borderWidth: 2,
  },

  // Completed card styles
  completedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  completedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    shadowColor: 'rgba(78, 205, 196, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  completedText: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  completedDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },

  // Invite card special styles
  inviteStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },

  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(211, 148, 245, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(211, 148, 245, 0.5)',
    shadowColor: 'rgba(211, 148, 245, 0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  inviteBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  invitePrompt: {
    color: 'rgba(211, 148, 245, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
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
  // Home Completion Banner Styles
  homeCompletionBanner: {
    backgroundColor: 'rgba(255, 230, 109, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 230, 109, 0.3)',
  },

  homeCompletionHeader: {
    marginBottom: 12,
  },

  homeCompletionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFE66D',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },

  homeCompletionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  homeCompletionBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  homeCompletionBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },

  homeCompletionFill: {
    height: '100%',
    backgroundColor: '#FFE66D',
    borderRadius: 3,
  },

  homeCompletionPercentage: {
    color: '#FFE66D',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    minWidth: 40,
  },

  // Full Screen CTA Styles
  fullScreenCTAContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    position: 'relative',
  },

  ctaWrapper: {
    width: '100%',
    maxWidth: 400,
  },

  floatingIconTopLeft: {
    position: 'absolute',
    top: 60,
    left: 30,
    opacity: 0.3,
  },

  floatingIconTopRight: {
    position: 'absolute',
    top: 100,
    right: 40,
    opacity: 0.3,
  },

  floatingIconBottomLeft: {
    position: 'absolute',
    bottom: 120,
    left: 50,
    opacity: 0.3,
  },

  floatingIconBottomRight: {
    position: 'absolute',
    bottom: 80,
    right: 30,
    opacity: 0.3,
  },

  wideStartActivityButton: {
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 320,
  },

  wideStartActivityButtonCompact: {
    minHeight: 240,
  },

  wideButtonGradientBorder: {
    flex: 1,
    borderRadius: 32,
    padding: 4,
    shadowColor: 'rgba(185, 84, 236, 0.6)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 24,
  },

  wideButtonInner: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(32, 25, 37, 0.95)',
    overflow: 'hidden',
  },

  wideButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
    gap: 20,
    position: 'relative',
    zIndex: 1,
  },

  wideButtonContentCompact: {
    paddingVertical: 32,
    gap: 12,
  },

  titleContainer: {
    alignItems: 'center',
    gap: 4,
  },

  wideButtonMainIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },

  wideButtonMainIconContainerCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 4,
  },

  iconGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(185, 84, 236, 0.3)',
    shadowColor: '#B954EC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },

  iconGlowCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  wideButtonTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
    fontFamily: 'Montserrat_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  wideButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
    paddingHorizontal: 8,
  },

  wideButtonMicroIcons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 20,
  },

  communityAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },

  communityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#2A1E30',
    backgroundColor: '#2A1E30',
  },

  communityAvatarCount: {
    backgroundColor: '#B954EC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  communityAvatarCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },

  wideMicroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  wideMicroIconActive: {
    backgroundColor: 'rgba(185, 84, 236, 0.3)',
    borderColor: 'rgba(185, 84, 236, 0.6)',
    borderWidth: 2.5,
    transform: [{ scale: 1.12 }],
    shadowColor: '#B954EC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },

  wideButtonCallToAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: 'rgba(185, 84, 236, 0.25)',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(185, 84, 236, 0.4)',
    gap: 10,
    shadowColor: '#B954EC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  wideButtonActionText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  wideButtonSparkle: {
    opacity: 0.9,
  },

  // Enhanced Favorite Card Styles
  favoriteCardContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
  },

  favoriteCardTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'left',
    letterSpacing: -0.2,
    marginBottom: 8,
  },

  favoriteCardDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
    paddingVertical: 4,
  },

  favoriteCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
  },

  favoriteCardMetaText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
  },

  favoriteCardPrice: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteCardDate: {
    color: 'rgba(212, 175, 55, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#201925',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },

  modalHeaderSpacer: {
    width: 32,
  },

  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: 'rgba(42, 30, 46, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },

  modalCardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSavedOnSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  modalSavedOnText: {
    color: 'rgba(212, 175, 55, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  modalSection: {
    marginBottom: 20,
  },

  modalSectionTitle: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  modalSectionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },

  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  modalMetaItem: {
    flex: 1,
    marginHorizontal: 6,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    alignItems: 'center',
  },

  modalMetaLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },

  modalMetaValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  modalWebsiteButton: {
    backgroundColor: '#9333EA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  modalWebsiteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Reviews and Photos Styles
  modalReviewItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },

  modalReviewText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  modalPhotosContainer: {
    flexDirection: 'row',
    paddingRight: 16,
  },

  modalPhotoItem: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // See All Card Styles
  seeAllCard: {
    width: 200,
    height: 220,
    marginRight: 16,
    backgroundColor: '#1a1420',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(185, 84, 236, 0.3)',
    borderStyle: 'dashed',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  
  seeAllFavoritesCard: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
    borderStyle: 'dashed',
  },
  
  seeAllHeader: {
    borderStyle: 'none',
  },
  
  seeAllMainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  
  seeAllCount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
    textShadowColor: 'rgba(185, 84, 236, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  
  seeAllLabel: {
    color: '#B8A5C4',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Modal List Styles (used by Favorites)
  modalListContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  
  pastActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.5)',
  },
  
  pastActivityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(185, 84, 236, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.2)',
  },
  
  
  pastActivityContent: {
    flex: 1,
    marginRight: 12,
  },
  
  pastActivityTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  pastActivityMeta: {
    color: '#B8A5C4',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  
  pastActivityParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  pastActivityParticipantText: {
    color: '#B8A5C4',
    fontSize: 12,
    fontWeight: '500',
  },
  
  pastActivitySeparator: {
    height: 12,
  },
  
  favoritePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  
  favoritePriceText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
  },

  favoriteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  deleteFavoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },

  // Toggle Tab Styles
  topToggleTab: {
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },

  // List View Styles
  listContainer: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },

  listItemInvite: {
    borderColor: 'rgba(211, 148, 245, 0.6)',
    borderWidth: 2,
    backgroundColor: 'rgba(211, 148, 245, 0.08)',
    shadowColor: 'rgba(211, 148, 245, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },

  userOwnedListItem: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    borderWidth: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  listItemFavorite: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },

  listItemFirst: {
    marginTop: 0,
  },

  listItemLast: {
    marginBottom: 16,
  },

  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  listItemContent: {
    flex: 1,
    marginRight: 12,
  },

  listItemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },

  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  listItemType: {
    color: '#B8A5C4',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  listItemHost: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  listItemDate: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '500',
  },

  listItemLocation: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  listItemPrice: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
  },
  listItemSavedDate: {
    color: 'rgba(212, 175, 55, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  modalSavedDate: {
    color: 'rgba(212, 175, 55, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 4,
  },

  listItemStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    gap: 4,
  },

  listItemStatusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listItemStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  listItemInviteStatusText: {
    fontSize: 13,
    fontWeight: '800',
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },

  // Host tag styles
  hostTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#cc31e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },

  hostTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  listHostBadge: {
    backgroundColor: '#cc31e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },

  listHostBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'right',
  },

  listHostBadgeCorner: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#cc31e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },

  listHostBadgeCornerText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // See All List Item Styles
  seeAllListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.4)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.15)',
    borderStyle: 'dashed',
  },

  seeAllListIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  seeAllListContent: {
    flex: 1,
    marginRight: 12,
  },

  seeAllListTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  seeAllListSubtitle: {
    color: '#B8A5C4',
    fontSize: 13,
    fontWeight: '500',
  },
})