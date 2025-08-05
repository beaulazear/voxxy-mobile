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
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { UserContext } from '../context/UserContext'
import AccountCreatedScreen from './AccountCreatedScreen'
import VoxxyFooter from '../components/VoxxyFooter'
import { Users, HelpCircle, X, Plus, Zap, CheckCircle, BookOpen, Mail, Coffee, MapPin, Star, User, Activity, Hamburger, Martini, Dices, ChevronRight } from 'lucide-react-native'
import CustomHeader from '../components/CustomHeader'
import YourCommunity from '../components/YourCommunity'
import ProfileSnippet from '../components/ProfileSnippet'
import { useNavigation } from '@react-navigation/native';
import PushNotificationService from '../services/PushNotificationService';
import { API_URL } from '../config';
import { Alert } from 'react-native';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

const { width: screenWidth } = Dimensions.get('window')

const FULL_HEIGHT = 333

const FILTERS = [
  { key: 'In Progress', icon: Zap },
  { key: 'Past Activities', icon: CheckCircle },
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
        <View style={styles.countdownBlock}>
          <Text style={styles.countdownNumber}>{countdown.secs}</Text>
          <Text style={styles.countdownUnit}>sec</Text>
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

// See All Past Activities Card
function SeeAllCard({ onPress, totalCount, type = 'activities' }) {
  return (
    <TouchableOpacity
      style={styles.seeAllCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.seeAllContent}>
        <View style={styles.seeAllIconContainer}>
          <BookOpen color="#B954EC" size={24} strokeWidth={2} />
        </View>
        <Text style={styles.seeAllTitle}>See All</Text>
        <Text style={styles.seeAllSubtitle}>{totalCount} total {type}</Text>
        <View style={styles.seeAllArrow}>
          <Text style={styles.seeAllArrowText}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// Animated Create New Activity Card with cycling icons and Voxxy gradient
function CreateCard({ navigation, isLast, isInvitesEmpty = false }) {
  const title = isInvitesEmpty ? 'No Current Invites' : 'Create New Activity'
  const subtitle = isInvitesEmpty ? 'Be the first to invite your friends!' : 'Start planning something amazing!'
  const actionText = isInvitesEmpty ? 'Start planning now →' : 'Ready to vibe? →'

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0)).current
  const iconRotation = useRef(new Animated.Value(0)).current
  const floatAnim = useRef(new Animated.Value(0)).current
  
  // Cycling icons for activities
  const activityIcons = [
    { component: Hamburger, color: '#FF6B6B', name: 'food' },
    { component: Martini, color: '#4ECDC4', name: 'drinks' },
    { component: Dices, color: '#FFE66D', name: 'games' },
    { component: Users, color: '#A8E6CF', name: 'meeting' }
  ]
  
  const [currentIconIndex, setCurrentIconIndex] = useState(0)
  const CurrentIcon = activityIcons[currentIconIndex].component
  const currentIconColor = activityIcons[currentIconIndex].color

  // Start animations on mount
  useEffect(() => {
    // Pulsing animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    )

    // Float animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 5,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    )

    pulseAnimation.start()
    glowAnimation.start()
    floatAnimation.start()

    // Icon cycling every 2.5 seconds
    const iconInterval = setInterval(() => {
      // Add rotation animation when changing icons
      Animated.timing(iconRotation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIconIndex((prev) => (prev + 1) % activityIcons.length)
        iconRotation.setValue(0)
      })
    }, 2500)

    return () => {
      pulseAnimation.stop()
      glowAnimation.stop()
      floatAnimation.stop()
      clearInterval(iconInterval)
    }
  }, [])

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8]
  })

  const iconRotationDegree = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })

  return (
    <Animated.View
      style={[
        { transform: [{ scale: pulseAnim }, { translateY: floatAnim }] }
      ]}
    >
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
        activeOpacity={0.8}
      >
        {/* Animated Glow Effect */}
        <Animated.View 
          style={[
            styles.createCardAnimatedGlow, 
            { opacity: glowOpacity }
          ]} 
        />

        {/* Voxxy Gradient Background */}
        <LinearGradient
          colors={['#cc31e8', '#9051e1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.createCardGradient}
        >
          <View style={styles.createCardContent}>
            {/* Animated Main Icon */}
            <Animated.View 
              style={[
                styles.createMainIconContainer,
                { transform: [{ rotate: iconRotationDegree }] }
              ]}
            >
              {isInvitesEmpty ? (
                <Mail color="#ffffff" size={32} strokeWidth={2.5} />
              ) : (
                <CurrentIcon color="#ffffff" size={32} strokeWidth={2.5} />
              )}
            </Animated.View>

            <Text style={styles.createTitle}>{title}</Text>
            <Text style={styles.createSubtitle}>{subtitle}</Text>

            {/* Floating micro icons */}
            {!isInvitesEmpty && (
              <View style={styles.createMicroIcons}>
                {activityIcons.map((icon, index) => {
                  const IconComponent = icon.component
                  const isActive = index === currentIconIndex
                  return (
                    <Animated.View 
                      key={index}
                      style={[
                        styles.microIcon,
                        isActive && styles.microIconActive
                      ]}
                    >
                      <IconComponent 
                        color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'} 
                        size={14} 
                        strokeWidth={2} 
                      />
                    </Animated.View>
                  )
                })}
              </View>
            )}

            {isInvitesEmpty && (
              <View style={styles.invitesEmptyIcon}>
                <Text style={styles.invitesEmptyEmoji}>💌</Text>
              </View>
            )}

            <View style={styles.createCallToAction}>
              <Text style={styles.createActionText}>{actionText}</Text>
              <Animated.View style={[styles.createSparkle, { transform: [{ rotate: iconRotationDegree }] }]}>
                <Zap color="#ffffff" size={16} strokeWidth={2.5} />
              </Animated.View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  )
}

// Animated Start New Activity Wide Button
function AnimatedStartNewActivityButton({ navigation }) {
  // Simple opacity animation for subtle glow effect
  const glowOpacity = useRef(new Animated.Value(0.3)).current
  
  // Cycling icons for activities
  const activityIcons = [
    { component: Hamburger, color: '#FF6B6B', name: 'food' },
    { component: Martini, color: '#4ECDC4', name: 'drinks' },
    { component: Dices, color: '#FFE66D', name: 'games' },
    { component: Users, color: '#A8E6CF', name: 'meeting' }
  ]
  
  const [currentIconIndex, setCurrentIconIndex] = useState(0)
  const CurrentIcon = activityIcons[currentIconIndex].component

  // Start simple animation
  useEffect(() => {
    // Simple glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    )

    glowAnimation.start()

    // Icon cycling every 3 seconds
    const iconInterval = setInterval(() => {
      setCurrentIconIndex((prev) => (prev + 1) % activityIcons.length)
    }, 3000)

    return () => {
      glowAnimation.stop()
      clearInterval(iconInterval)
    }
  }, [])

  return (
    <View style={styles.wideButtonContainer}>
      <TouchableOpacity
        style={styles.wideStartActivityButton}
        onPress={() => {
          if (Haptics?.impactAsync) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
          navigation.navigate('TripDashboardScreen')
        }}
        activeOpacity={0.8}
      >
        {/* Gradient Border */}
        <LinearGradient
          colors={['#cc31e8', '#9051e1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wideButtonGradientBorder}
        >
          <View style={styles.wideButtonInner}>
            <View style={styles.wideButtonContent}>
              {/* Main Icon */}
              <View style={styles.wideButtonMainIconContainer}>
                <CurrentIcon color="#ffffff" size={32} strokeWidth={2.5} />
              </View>

              <Text style={styles.wideButtonTitle}>Start New Activity</Text>
              <Text style={styles.wideButtonSubtitle}>Ready to create something amazing?</Text>

              {/* Cycling micro icons */}
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
                        color={isActive ? '#ffffff' : 'rgba(255,255,255,0.5)'} 
                        size={16} 
                        strokeWidth={2} 
                      />
                    </Animated.View>
                  )
                })}
              </View>

              <View style={styles.wideButtonCallToAction}>
                <Text style={styles.wideButtonActionText}>Ready to vibe? Let's go! →</Text>
                <View style={styles.wideButtonSparkle}>
                  <Zap color="#ffffff" size={18} strokeWidth={2.5} />
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
        </TouchableOpacity>
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


export default function HomeScreen() {
  const { user } = useContext(UserContext)
  const navigation = useNavigation()
  const [mainTab, setMainTab] = useState('Activities')
  const [filter, setFilter] = useState('')
  const [showAllPast, setShowAllPast] = useState(false)
  const [userFavorites, setUserFavorites] = useState([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [selectedFavorite, setSelectedFavorite] = useState(null)
  const [showFavoriteModal, setShowFavoriteModal] = useState(false)
  const [showPastActivitiesModal, setShowPastActivitiesModal] = useState(false)
  const [showAllFavoritesModal, setShowAllFavoritesModal] = useState(false)
  const scrollY = useRef(new Animated.Value(0)).current
  const scrollRef = useRef(null)

  const scrollToTop = () => {
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true })
  }

  // Fetch user favorites
  const fetchUserFavorites = async () => {
    if (!user?.token) {
      console.log('No user token available for fetching favorites')
      return
    }
    
    console.log('Fetching favorites from:', `${API_URL}/user_activities/favorited`)
    setLoadingFavorites(true)
    try {
      const favorites = await safeAuthApiCall(
        `${API_URL}/user_activities/favorited`,
        user.token,
        { method: 'GET' }
      )
      
      console.log('Fetched favorites:', favorites)
      console.log('Favorites count:', favorites.length)
      setUserFavorites(favorites || [])
    } catch (error) {
      console.error('Error fetching favorites:', error)
      const userMessage = handleApiError(error, 'Failed to load favorites. Please try again.');
      // Only show alert for non-network errors to avoid spam
      if (!error.message.includes('Network connection failed')) {
        Alert.alert('Error', userMessage);
      }
    } finally {
      setLoadingFavorites(false)
    }
  }

  // Fetch favorites when user changes or when Favorites tab is selected
  useEffect(() => {
    console.log('Filter changed to:', filter)
    console.log('User token exists:', !!user?.token)
    if (filter === 'Favorites' && user?.token) {
      console.log('Triggering favorites fetch...')
      fetchUserFavorites()
    }
  }, [filter, user?.token])

  // Also fetch favorites when component mounts if we're on favorites tab
  useEffect(() => {
    if (filter === 'Favorites' && user?.token && userFavorites.length === 0) {
      console.log('Component mounted on Favorites tab, fetching...')
      fetchUserFavorites()
    }
  }, [user?.token])

  const activities = useMemo(() => {
    if (!user) return []
    const mine = user?.activities || []
    const theirs = user?.participant_activities
      ?.filter(p => p.accepted)
      .map(p => p.activity) || []
    return [...new Map([...mine, ...theirs].map(a => [a.id, a])).values()]
  }, [user])

  // Combine in-progress and finalized into one category
  const inProgress = activities.filter(a => !a.completed)
  const past = activities.filter(a => a.completed)
  const invites = user?.participant_activities
    ?.filter(p => !p.accepted)
    .map(p => p.activity) || []

  useEffect(() => {
    // Only set filter if it's not already set
    if (!filter || filter === '') {
      if (invites.length > 0) {
        setFilter('Invites')
      } else if (inProgress.length > 0) {
        setFilter('In Progress')
      } else if (past.length > 0) {
        setFilter('Past Activities')
      } else {
        setFilter('In Progress')
      }
    }
  }, [invites.length, inProgress.length, past.length, filter])

  if (user && !user.confirmed_at) {
    return <AccountCreatedScreen />
  }

  const filteredActivities = (() => {
    const dataMap = {
      'In Progress': inProgress,
      'Past Activities': past,
      'Invites': invites,
      'Favorites': userFavorites,
    }

    const data = dataMap[filter] || []
    
    if (filter === 'Favorites') {
      console.log('Filtering favorites, userFavorites:', userFavorites)
      console.log('Data for favorites:', data)
    }

    const sortedData = data.sort((a, b) => {
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
      
      // For Past Activities and Favorites, sort by created_at (most recent first)
      if (filter === 'Past Activities' || filter === 'Favorites') {
        const dateA = new Date(a.created_at || '1970-01-01')
        const dateB = new Date(b.created_at || '1970-01-01')
        return dateB - dateA
      }
      
      // For other activities, sort by date_day (soonest first)
      const dateA = new Date(a.date_day || '9999-12-31')
      const dateB = new Date(b.date_day || '9999-12-31')
      return dateA - dateB
    })

    // For Past Activities, only show 3 most recent
    if (filter === 'Past Activities' && sortedData.length > 3) {
      return sortedData.slice(0, 3)
    }
    
    // For Favorites, only show 3 most recent
    if (filter === 'Favorites' && sortedData.length > 3) {
      return sortedData.slice(0, 3)
    }

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



  function renderFavoriteCard({ item, index }) {
    // Debug logging
    console.log('Rendering favorite card for item:', item)
    console.log('Item keys:', Object.keys(item))
    
    // For favorites, item is a user_activity with nested pinned_activity and activity
    const pinnedActivity = item.pinned_activity || item
    const activity = item.activity || pinnedActivity?.activity
    
    console.log('pinnedActivity:', pinnedActivity)
    console.log('activity:', activity)
    
    const activityType = activity?.activity_type || 'Restaurant'
    const displayInfo = getActivityDisplayInfo(activityType)

    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.favoriteCard,
          index === 0 && styles.firstCard,
          index === displayedActivities.length - 1 && styles.lastCard
        ]}
        onPress={() => {
          if (Haptics?.impactAsync) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
          // Show favorite details modal instead of navigating to activity
          setSelectedFavorite(item)
          setShowFavoriteModal(true)
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
          </View>
          {/* Favorite star indicator */}
          <View style={styles.favoriteIndicator}>
            <Star color="#D4AF37" size={16} fill="#D4AF37" />
          </View>
        </View>

        {/* Card content */}
        <View style={styles.favoriteCardContent}>
          <Text style={styles.favoriteCardTitle} numberOfLines={2}>
            {item.title || pinnedActivity?.title || 'Favorite Recommendation'}
          </Text>
          
          {item.address && (
            <View style={styles.favoriteCardMeta}>
              <MapPin color="rgba(255, 255, 255, 0.6)" size={12} />
              <Text style={styles.favoriteCardMetaText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}
          
          {item.price_range && (
            <View style={styles.favoriteCardMeta}>
              <Text style={styles.favoriteCardPrice}>{item.price_range}</Text>
            </View>
          )}
        </View>

        {/* Favorite badge */}
        <View style={styles.favoriteBadge}>
          <Text style={styles.favoriteBadgeText}>★ Favorite</Text>
        </View>
      </TouchableOpacity>
    )
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
              // Set appropriate filter when switching to Activities tab
              if (invites.length > 0) {
                setFilter('Invites')
              } else if (inProgress.length > 0) {
                setFilter('In Progress')
              } else if (past.length > 0) {
                setFilter('Past Activities')
              } else {
                setFilter('In Progress')
              }
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
      <ProfileSnippet 
        scrollY={scrollY} 
        onScrollToTop={scrollToTop} 
        setFilter={setFilter} 
        setMainTab={setMainTab}
        invitesCount={invites.length}
        inProgressCount={inProgress.length}
        pastCount={past.length}
      />
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
                      const count = filterItem.key === 'Invites' ? invites.length : 
                                   filterItem.key === 'Favorites' ? userFavorites.length : 0
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
                            width={16}
                            height={16}
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
                          {loadingFavorites ? (
                            <>
                              <Text style={styles.sideEmptyIcon}>⏳</Text>
                              <Text style={styles.sideEmpty}>Loading favorites...</Text>
                              <Text style={styles.sideEmptySub}>
                                Fetching your saved recommendations
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.sideEmptyIcon}>⭐</Text>
                              <Text style={styles.sideEmpty}>No favorites yet</Text>
                              <Text style={styles.sideEmptySub}>
                                Mark activities as favorites to see them here!
                              </Text>
                            </>
                          )}
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
                      data={
                        (filter === 'Past Activities' && past.length > 3) || 
                        (filter === 'Favorites' && userFavorites.length > 3)
                          ? [...displayedActivities, { isSeeAll: true }]
                          : displayedActivities
                      }
                      keyExtractor={(item, index) => {
                        if (item.isSeeAll) return 'see-all'
                        if (filter === 'Favorites') {
                          // For favorites, use the user_activity id or combination
                          return String(item.id || `${item.user_id}-${item.pinned_activity_id}`)
                        }
                        return String(item.id)
                      }}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item, index }) => {
                        if (item.isSeeAll) {
                          return (
                            <SeeAllCard 
                              onPress={() => {
                                if (filter === 'Past Activities') {
                                  setShowPastActivitiesModal(true)
                                } else if (filter === 'Favorites') {
                                  setShowAllFavoritesModal(true)
                                }
                              }}
                              totalCount={filter === 'Past Activities' ? past.length : userFavorites.length}
                              type={filter === 'Favorites' ? 'favorites' : 'activities'}
                            />
                          )
                        }
                        if (filter === 'Favorites') {
                          return renderFavoriteCard({ item, index })
                        }
                        return renderCard({ item, index })
                      }}
                      contentContainerStyle={styles.horizontalGrid}
                      snapToAlignment="start"
                      decelerationRate="fast"
                      snapToInterval={176} // card width + margin (160 + 16)
                    />
                  )}
                </View>
                
                {/* Animated Start New Activity Button - Wide Version */}
                <AnimatedStartNewActivityButton navigation={navigation} />
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
      
      {/* Favorite Details Modal */}
      <Modal
        visible={showFavoriteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFavoriteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFavoriteModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Favorite Details</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          {selectedFavorite && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalCard}>
                <Text style={styles.modalCardTitle}>
                  {selectedFavorite.title}
                </Text>
                
                {selectedFavorite.description && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Description</Text>
                    <Text style={styles.modalSectionText}>
                      {selectedFavorite.description}
                    </Text>
                  </View>
                )}
                
                {selectedFavorite.reason && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Why it's recommended</Text>
                    <Text style={styles.modalSectionText}>
                      {selectedFavorite.reason}
                    </Text>
                  </View>
                )}
                
                {selectedFavorite.address && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Location</Text>
                    <Text style={styles.modalSectionText}>
                      {selectedFavorite.address}
                    </Text>
                  </View>
                )}
                
                <View style={styles.modalMetaRow}>
                  {selectedFavorite.price_range && (
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalMetaLabel}>Price Range</Text>
                      <Text style={styles.modalMetaValue}>{selectedFavorite.price_range}</Text>
                    </View>
                  )}
                  
                  {selectedFavorite.hours && (
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalMetaLabel}>Hours</Text>
                      <Text style={styles.modalMetaValue}>{selectedFavorite.hours}</Text>
                    </View>
                  )}
                </View>
                
                {selectedFavorite.reviews && Array.isArray(selectedFavorite.reviews) && selectedFavorite.reviews.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Reviews</Text>
                    {selectedFavorite.reviews.slice(0, 3).map((review, index) => (
                      <View key={index} style={styles.modalReviewItem}>
                        <Text style={styles.modalReviewText}>"{review}"</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {selectedFavorite.photos && Array.isArray(selectedFavorite.photos) && selectedFavorite.photos.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.modalPhotosContainer}>
                        {selectedFavorite.photos.slice(0, 5).map((photo, index) => (
                          <Image
                            key={index}
                            source={{ uri: photo }}
                            style={styles.modalPhotoItem}
                            resizeMode="cover"
                          />
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {selectedFavorite.website && (
                  <TouchableOpacity
                    style={styles.modalWebsiteButton}
                    onPress={() => Linking.openURL(selectedFavorite.website)}
                  >
                    <Text style={styles.modalWebsiteText}>Visit Website</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
      
      {/* Past Activities Modal */}
      <Modal
        visible={showPastActivitiesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPastActivitiesModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPastActivitiesModal(false)}
            >
              <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>All Past Activities</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <FlatList
            data={past.sort((a, b) => new Date(b.created_at || '1970-01-01') - new Date(a.created_at || '1970-01-01'))}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const displayInfo = getActivityDisplayInfo(item.activity_type)
              return (
                <TouchableOpacity
                  style={styles.pastActivityItem}
                  onPress={() => {
                    setShowPastActivitiesModal(false)
                    navigation.navigate('ActivityDetails', { activityId: item.id })
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.pastActivityIcon}>
                    {displayInfo.icon && (
                      <displayInfo.icon 
                        color={displayInfo.iconColor} 
                        size={24} 
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <View style={styles.pastActivityContent}>
                    <Text style={styles.pastActivityTitle}>{item.activity_name}</Text>
                    <Text style={styles.pastActivityMeta}>
                      {displayInfo.displayText} • {formatDate(item.date_day)}
                    </Text>
                    <View style={styles.pastActivityParticipants}>
                      <Users stroke="#B8A5C4" width={14} height={14} />
                      <Text style={styles.pastActivityParticipantText}>
                        {item.participants?.length || 0} participants
                      </Text>
                    </View>
                  </View>
                  <ChevronRight stroke="#B8A5C4" width={20} height={20} />
                </TouchableOpacity>
              )
            }}
            contentContainerStyle={styles.modalListContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.pastActivitySeparator} />}
          />
        </SafeAreaView>
      </Modal>
      
      {/* All Favorites Modal */}
      <Modal
        visible={showAllFavoritesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllFavoritesModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAllFavoritesModal(false)}
            >
              <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>All Favorites</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <FlatList
            data={userFavorites.sort((a, b) => new Date(b.created_at || '1970-01-01') - new Date(a.created_at || '1970-01-01'))}
            keyExtractor={(item) => String(item.id || `${item.user_id}-${item.pinned_activity_id}`)}
            renderItem={({ item }) => {
              // For favorites, item is a user_activity with its own title and address
              const activity = item.activity || item.pinned_activity?.activity
              const activityType = activity?.activity_type || 'Restaurant'
              const displayInfo = getActivityDisplayInfo(activityType)
              
              return (
                <TouchableOpacity
                  style={styles.pastActivityItem}
                  onPress={() => {
                    setShowAllFavoritesModal(false)
                    setSelectedFavorite(item)
                    setShowFavoriteModal(true)
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.pastActivityIcon}>
                    {displayInfo.icon && (
                      <displayInfo.icon 
                        color={displayInfo.iconColor} 
                        size={24} 
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <View style={styles.pastActivityContent}>
                    <Text style={styles.pastActivityTitle}>{item.title || 'Unnamed'}</Text>
                    <Text style={styles.pastActivityMeta}>
                      {displayInfo.displayText} • {item.address ? item.address.split(',')[0] : 'Location not specified'}
                    </Text>
                    {item.price_range && (
                      <View style={styles.favoritePriceContainer}>
                        <Text style={styles.favoritePriceText}>{item.price_range}</Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight stroke="#B8A5C4" width={20} height={20} />
                </TouchableOpacity>
              )
            }}
            contentContainerStyle={styles.modalListContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.pastActivitySeparator} />}
          />
        </SafeAreaView>
      </Modal>
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

  // Activities with filters layout
  activitiesWithFilters: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 200, // Match card height
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
    width: 36,
    height: 36,
    borderRadius: 8,
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
    width: 36,
    height: 36,
    borderRadius: 8,
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
    minHeight: 200, // Match card height
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



  // Animated Create Card Styles
  createCard: {
    width: 180,
    height: 200,
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
    width: 180,
    height: 200,
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
  favoriteCard: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
    backgroundColor: 'rgba(42, 30, 46, 0.98)',
    shadowColor: 'rgba(212, 175, 55, 0.2)',
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
  // Animated Wide Button Styles
  wideButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 36,
  },

  wideStartActivityButton: {
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 180,
  },


  wideButtonGradientBorder: {
    flex: 1,
    borderRadius: 28,
    padding: 3, // This creates the border thickness
    shadowColor: 'rgba(204, 49, 232, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
  },
  
  wideButtonInner: {
    flex: 1,
    borderRadius: 25, // Slightly smaller to account for padding
    backgroundColor: '#201925', // Same as background
    overflow: 'hidden',
  },

  wideButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 16,
  },

  wideButtonMainIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  wideButtonTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: 'Montserrat_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  wideButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },

  wideButtonMicroIcons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },

  wideMicroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  wideMicroIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },

  wideButtonCallToAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },

  wideButtonActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    backgroundColor: '#cc31e8',
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
    width: 160,
    height: 200,
    marginRight: 16,
    backgroundColor: 'rgba(42, 30, 46, 0.95)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(185, 84, 236, 0.4)',
    borderStyle: 'dashed',
    shadowColor: 'rgba(185, 84, 236, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  
  seeAllContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  
  seeAllIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(185, 84, 236, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.4)',
  },
  
  seeAllTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  
  seeAllSubtitle: {
    color: '#B8A5C4',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  
  seeAllArrow: {
    marginTop: 8,
  },
  
  seeAllArrowText: {
    color: '#B954EC',
    fontSize: 24,
    fontWeight: '700',
  },
  
  // Past Activities Modal Styles
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
})