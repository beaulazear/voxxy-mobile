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
import { Users, X, Plus, Zap, CheckCircle, BookOpen, Mail, Coffee, MapPin, Star, User, Activity, Hamburger, Martini, ChevronRight, ToggleLeft, ToggleRight, Grid3X3, List } from 'lucide-react-native'
import ProfileSnippet from '../components/ProfileSnippet'
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import { Alert } from 'react-native';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';
import UnifiedActivityChat from '../components/UnifiedActivityChat';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window')

const FULL_HEIGHT = 333

const FILTERS = [
  { key: 'Toggle', icon: Grid3X3, isToggle: true },
  { key: 'Active', icon: Zap },
  { key: 'Favorites', icon: Star }
]

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
            <Text style={styles.respondedText}>Submitted!</Text>
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

// See All Card Component
function SeeAllCard({ onPress, totalCount, type = 'activities' }) {
  const isFavorites = type === 'favorites'
  return (
    <TouchableOpacity
      style={[
        styles.seeAllCard,
        isFavorites && styles.seeAllFavoritesCard
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header matching activity cards */}
      <View style={[styles.cardHeader, styles.seeAllHeader]}>
        <View style={styles.cardIconContainer}>
          <BookOpen color={isFavorites ? "#D4AF37" : "#B954EC"} size={20} strokeWidth={2} />
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardType}>Collection</Text>
          <Text style={styles.cardHost}>view all</Text>
        </View>
      </View>
      
      {/* Content area */}
      <View style={styles.seeAllMainContent}>
        <Text style={styles.seeAllCount}>{totalCount}</Text>
        <Text style={styles.seeAllLabel}>Total {type}</Text>
      </View>
      
      {/* Bottom area matching activity cards */}
      <View style={styles.cardTitleArea}>
        <Text style={styles.cardTitle}>
          {isFavorites ? 'View All Favorites' : 'View All Activities'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// Animated Create New Activity Card with cycling icons and Voxxy gradient
function CreateCard({ navigation, isLast, isInvitesEmpty = false, onPress }) {
  const title = isInvitesEmpty ? 'No Current Invites' : 'Create New Activity'
  const subtitle = isInvitesEmpty ? 'Be the first to invite your friends!' : 'Start planning something amazing!'
  const actionText = isInvitesEmpty ? 'Start planning now →' : 'Ready to vibe? →'

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0)).current
  const iconRotation = useRef(new Animated.Value(0)).current
  const floatAnim = useRef(new Animated.Value(0)).current
  
  // Cycling icons for dining options
  const activityIcons = [
    { component: Hamburger, color: '#FF6B6B', name: 'restaurant' },
    { component: Martini, color: '#4ECDC4', name: 'bar' }
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
          onPress()
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
function AnimatedStartNewActivityButton({ navigation, onPress }) {
  // Simple opacity animation for subtle glow effect
  const glowOpacity = useRef(new Animated.Value(0.3)).current
  
  // Cycling icons for dining options
  const activityIcons = [
    { component: Hamburger, color: '#FF6B6B', name: 'restaurant' },
    { component: Martini, color: '#4ECDC4', name: 'bar' }
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
          onPress()
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

              <Text style={styles.wideButtonTitle}>Plan Your Next Outing</Text>
              <Text style={styles.wideButtonSubtitle}>Find the perfect spot to meet</Text>

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
                <Text style={styles.wideButtonActionText}>Ready to vibe? →</Text>
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


export default function HomeScreen({ route }) {
  const { user } = useContext(UserContext)
  const navigation = useNavigation()
  const [filter, setFilter] = useState('')
  const [showAllPast, setShowAllPast] = useState(false)
  const [userFavorites, setUserFavorites] = useState([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [selectedFavorite, setSelectedFavorite] = useState(null)
  const [showFavoriteModal, setShowFavoriteModal] = useState(false)
  const [isListView, setIsListView] = useState(true)
  const [showActivityCreation, setShowActivityCreation] = useState(false)
  const scrollY = useRef(new Animated.Value(0)).current
  const scrollRef = useRef(null)

  const scrollToTop = () => {
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true })
  }

  // Handle activity creation completion
  const handleActivityCreated = (newActivityId) => {
    if (newActivityId) {
      setShowActivityCreation(false)
      navigation.navigate('ActivityDetails', { activityId: newActivityId })
    } else {
      setShowActivityCreation(false)
    }
  }


  // Fetch user favorites
  const fetchUserFavorites = async () => {
    if (!user?.token) {
      logger.debug('No user token available for fetching favorites')
      return
    }
    
    logger.debug('Fetching favorites from:', `${API_URL}/user_activities/favorited`)
    setLoadingFavorites(true)
    try {
      const favorites = await safeAuthApiCall(
        `${API_URL}/user_activities/favorited`,
        user.token,
        { method: 'GET' }
      )
      
      // Filter out favorites where the activity has been deleted
      const validFavorites = (favorites || []).filter(fav => {
        const hasActivity = fav.activity || fav.pinned_activity?.activity
        if (!hasActivity) {
          logger.debug('Filtering out favorite with missing activity:', fav.id)
        }
        return hasActivity
      })
      
      setUserFavorites(validFavorites)
    } catch (error) {
      logger.error('Error fetching favorites:', error)
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
    logger.debug('Filter changed to:', filter)
    logger.debug('User token exists:', !!user?.token)
    if (filter === 'Favorites' && user?.token) {
      logger.debug('Triggering favorites fetch...')
      fetchUserFavorites()
    }
  }, [filter, user?.token])

  // Fetch favorites on component mount to always have the count available
  useEffect(() => {
    if (user?.token) {
      logger.debug('Fetching favorites on component mount...')
      fetchUserFavorites()
    }
  }, [user?.token])

  // Handle navigation params to show favorites modal
  useEffect(() => {
    if (route?.params?.showFavorites) {
      setShowAllFavoritesModal(true)
      // Clear the param to prevent it from triggering again
      navigation.setParams({ showFavorites: undefined })
    }
  }, [route?.params?.showFavorites, navigation])

  // Delete a favorite
  const deleteFavorite = async (favoriteId) => {
    if (!user?.token) return

    try {
      await safeAuthApiCall(
        `${API_URL}/user_activities/${favoriteId}`,
        user.token,
        { method: 'DELETE' }
      )
      
      // Update the local state by removing the deleted favorite
      setUserFavorites(prevFavorites => 
        prevFavorites.filter(fav => fav.id !== favoriteId)
      )
      
      logger.debug(`Favorite with ID ${favoriteId} deleted successfully`)
      Alert.alert('Success', 'Favorite removed successfully!')
    } catch (error) {
      logger.error('Error deleting favorite:', error)
      const userMessage = handleApiError(error, 'Failed to remove favorite. Please try again.')
      Alert.alert('Error', userMessage)
    }
  }

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

  useEffect(() => {
    // Only set filter if it's not already set
    if (!filter || filter === '') {
      setFilter('Active')
    }
  }, [filter])

  if (user && !user.confirmed_at) {
    return <AccountCreatedScreen />
  }

  // Store the original unsliced counts for accurate totals
  const originalCounts = {
    'Favorites': userFavorites.length,
    'Active': inProgress.length + invites.length
  }

  const filteredActivities = (() => {
    const dataMap = {
      'Active': [...inProgress, ...invites],
      'Favorites': userFavorites,
    }

    const data = dataMap[filter] || []
    
    if (filter === 'Favorites') {
      logger.debug('Filtering favorites, userFavorites:', userFavorites)
      logger.debug('Data for favorites:', data)
    }

    const sortedData = data.sort((a, b) => {
      // For in-progress activities, prioritize action needed items
      if (filter === 'Active') {
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
      
      // For Favorites, sort by created_at (most recent first)
      if (filter === 'Favorites') {
        const dateA = new Date(a.created_at || '1970-01-01')
        const dateB = new Date(b.created_at || '1970-01-01')
        return dateB - dateA
      }
      
      // For other activities, sort by date_day (soonest first)
      const dateA = new Date(a.date_day || '9999-12-31')
      const dateB = new Date(b.date_day || '9999-12-31')
      return dateA - dateB
    })
    
    
    // For Favorites, only show 5 most recent
    if (filter === 'Favorites' && sortedData.length > 5) {
      return sortedData.slice(0, 5)
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
    logger.debug('Rendering favorite card for item:', item)
    logger.debug('Item keys:', Object.keys(item))
    
    // For favorites, item is a user_activity with nested pinned_activity and activity
    const pinnedActivity = item.pinned_activity || item
    const activity = item.activity || pinnedActivity?.activity
    
    logger.debug('pinnedActivity:', pinnedActivity)
    logger.debug('activity:', activity)
    
    // Skip rendering if activity is missing (shouldn't happen with filtering, but extra safety)
    if (!activity) {
      logger.warn('Skipping favorite card with missing activity:', item.id)
      return null
    }
    
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
        {/* Corner decorations for favorites */}
        <View style={[styles.cardCorner, styles.cardCornerTopLeft, styles.favoriteCorner]} />
        <View style={[styles.cardCorner, styles.cardCornerTopRight, styles.favoriteCorner]} />
        <View style={[styles.cardCorner, styles.cardCornerBottomLeft, styles.favoriteCorner]} />
        <View style={[styles.cardCorner, styles.cardCornerBottomRight, styles.favoriteCorner]} />
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
          
          {/* Saved on date */}
          {item.created_at && (
            <View style={styles.favoriteCardMeta}>
              <Text style={styles.favoriteCardDate}>
                Saved {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
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
          if (Haptics?.impactAsync) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
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

  function renderFavoriteListItem({ item, index }) {
    const pinnedActivity = item.pinned_activity || item
    const activity = item.activity || pinnedActivity?.activity
    const activityType = activity?.activity_type || 'Restaurant'
    const displayInfo = getActivityDisplayInfo(activityType)

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          styles.listItemFavorite,
          index === 0 && styles.listItemFirst,
          index === displayedActivities.length - 1 && styles.listItemLast
        ]}
        onPress={() => {
          if (Haptics?.impactAsync) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
          setSelectedFavorite(item)
          setShowFavoriteModal(true)
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

        {/* Center: Favorite Info */}
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle} numberOfLines={1}>
            {item.title || pinnedActivity?.title || 'Favorite Recommendation'}
          </Text>
          <View style={styles.listItemMeta}>
            <Text style={styles.listItemType}>{displayInfo.displayText}</Text>
            {item.address && (
              <Text style={styles.listItemLocation} numberOfLines={1}>
                {item.address.split(',')[0]}
              </Text>
            )}
            {item.price_range && (
              <Text style={styles.listItemPrice}>{item.price_range}</Text>
            )}
            {/* Saved on date */}
            {item.created_at && (
              <Text style={styles.listItemSavedDate}>
                Saved {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Favorite Star */}
        <View style={styles.listItemStatus}>
          <Star color="#D4AF37" size={18} fill="#D4AF37" />
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
    const isUserHost = item.user?.id === user?.id
    
    // Debug logging for first grid card  
    if (index === 0) {
      logger.debug('DEBUG - First grid card:', {
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

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isInvite && styles.inviteCard,
          isUserHost && styles.userOwnedCard,
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
        {/* Corner decorations for activity cards */}
        <View style={[styles.cardCorner, styles.cardCornerTopLeft, styles.activityCorner]} />
        <View style={[styles.cardCorner, styles.cardCornerTopRight, styles.activityCorner]} />
        <View style={[styles.cardCorner, styles.cardCornerBottomLeft, styles.activityCorner]} />
        <View style={[styles.cardCorner, styles.cardCornerBottomRight, styles.activityCorner]} />
        
        
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
            <Text style={styles.cardHost}>by {isUserHost ? 'you' : firstName}</Text>
          </View>
        </View>

        {/* Status/Content Area */}
        <View style={styles.cardStatusArea}>
          {isInvite ? (
            <View style={styles.inviteStatusContainer}>
              <View style={styles.inviteBadge}>
                <Mail color="#fff" size={16} strokeWidth={2.5} />
                <Text style={styles.inviteBadgeText}>NEW INVITE</Text>
              </View>
              <Text style={styles.invitePrompt}>Tap to respond!</Text>
            </View>
          ) : countdownTs ? (
            <CountdownText targetTs={countdownTs} activityType={item.activity_type} />
          ) : isInProgress ? (
            <ProgressDisplay activity={item} currentUserId={user?.id} />
          ) : isCompleted ? (
            <View style={styles.completedContainer}>
              <View style={styles.completedStamp}>
                <CheckCircle color="#4ECDC4" size={24} strokeWidth={2.5} />
                <Text style={styles.completedText}>COLLECTED</Text>
              </View>
              <Text style={styles.completedDate}>{formatDate(item.date_day)}</Text>
            </View>
          ) : (
            <View style={styles.overlayStatusContainer}>
              <Text style={styles.overlayStatusText}>Planning...</Text>
            </View>
          )}
        </View>

        {/* Activity Name or Status */}
        <View style={styles.cardTitleArea}>
          <Text style={styles.cardTitle} numberOfLines={3} ellipsizeMode="tail">
            {item.finalized 
              ? item.activity_name 
              : item.voting 
                ? 'Choosing Venue' 
                : 'Collecting preferences'}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const ListHeader = () => (
    <>
      <View style={{ height: 300 }} />
      


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
        invitesCount={invites.length}
        inProgressCount={inProgress.length}
        pastCount={past.length}
        userFavorites={userFavorites}
        onShowFavorites={() => navigation.navigate('Favorites')}
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
            {/* Main content - Activities */}
              <>
                {/* Top Filter Tabs */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.topFiltersContent}
                  style={styles.topFiltersContainer}
                >
                    {FILTERS.map((filterItem) => {
                      const isActive = filter === filterItem.key
                      const IconComponent = filterItem.isToggle ? (isListView ? Grid3X3 : List) : filterItem.icon
                      const count = filterItem.key === 'Favorites' ? userFavorites.length : 
                                   filterItem.key === 'Active' ? (inProgress.length + invites.length) : 0
                      
                      if (filterItem.isToggle) {
                        return (
                          <TouchableOpacity
                            key={filterItem.key}
                            style={[
                              styles.topFilterTab,
                              styles.topToggleTab
                            ]}
                            onPress={() => {
                              if (Haptics?.impactAsync) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                              }
                              setIsListView(!isListView)
                            }}
                            activeOpacity={0.7}
                          >
                            <IconComponent
                              stroke={isListView ? '#4ECDC4' : '#B8A5C4'}
                              width={18}
                              height={18}
                              strokeWidth={2.5}
                            />
                          </TouchableOpacity>
                        )
                      }
                      
                      return (
                        <TouchableOpacity
                          key={filterItem.key}
                          style={[
                            styles.topFilterTab,
                            isActive && styles.topFilterTabActive
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
                            width={18}
                            height={18}
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                          <Text style={[
                            styles.topFilterTabText,
                            isActive && styles.topFilterTabTextActive
                          ]}>
                            {filterItem.key}
                          </Text>
                          {count > 0 && (
                            <View style={styles.topFilterBadge}>
                              <Text style={styles.topFilterBadgeText}>{count}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                    
                    {/* Create new activity button */}
                    <TouchableOpacity
                      style={styles.topCreateTab}
                      onPress={() => {
                        if (Haptics?.impactAsync) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        }
                        setShowActivityCreation(true)
                      }}
                      activeOpacity={0.7}
                    >
                      <Plus
                        color='#4ECDC4'
                        size={16}
                        strokeWidth={2.5}
                      />
                      <Text style={styles.topCreateTabText}>New</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Activities section */}
                <View style={styles.activitiesContainer}>
                  {filteredActivities.length === 0 ? (
                    // Show loading state for favorites
                    filter === 'Favorites' && loadingFavorites ? (
                      <View style={styles.sideEmptyContainer}>
                        <Text style={styles.sideEmptyIcon}>⏳</Text>
                        <Text style={styles.sideEmpty}>Loading favorites...</Text>
                        <Text style={styles.sideEmptySub}>
                          Fetching your saved recommendations
                        </Text>
                      </View>
                    ) : null // No empty state - just show Start New Activity button
                  ) : isListView ? (
                    // Vertical List View
                    <ScrollView 
                      style={styles.listContainer}
                      contentContainerStyle={styles.listContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {displayedActivities.map((item, index) => {
                        const key = filter === 'Favorites' 
                          ? String(item.id || `${item.user_id}-${item.pinned_activity_id}`)
                          : String(item.id)
                        
                        if (filter === 'Favorites') {
                          return (
                            <View key={key}>
                              {renderFavoriteListItem({ item, index })}
                            </View>
                          )
                        }
                        return (
                          <View key={key}>
                            {renderListItem({ item, index })}
                          </View>
                        )
                      })}
                      
                      {/* Show "See All" button for favorites in list view */}
                      {filter === 'Favorites' && originalCounts['Favorites'] > displayedActivities.length && (
                        <TouchableOpacity
                          style={styles.seeAllListItem}
                          onPress={() => navigation.navigate('Favorites')}
                          activeOpacity={0.7}
                        >
                          <View style={styles.seeAllListIcon}>
                            <BookOpen color="#B8A5C4" size={20} strokeWidth={2} />
                          </View>
                          <View style={styles.seeAllListContent}>
                            <Text style={styles.seeAllListTitle}>View All Favorites</Text>
                            <Text style={styles.seeAllListSubtitle}>
                              {userFavorites.length} total favorites
                            </Text>
                          </View>
                          <ChevronRight stroke="#B8A5C4" width={20} height={20} />
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  ) : (
                    // Horizontal Grid View (existing)
                    <FlatList
                      data={
                        (filter === 'Favorites' && originalCounts['Favorites'] >= 1)
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
                                if (filter === 'Favorites') {
                                  navigation.navigate('Favorites')
                                }
                              }}
                              totalCount={filter === 'Favorites' ? userFavorites.length : (originalCounts[filter] || 0)}
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
                      snapToInterval={216} // card width + margin (200 + 16)
                    />
                  )}
                </View>
                
                {/* Animated Start New Activity Button - Wide Version */}
                <AnimatedStartNewActivityButton 
                  navigation={navigation} 
                  onPress={() => setShowActivityCreation(true)} 
                />
              </>
            <ListFooter />
          </>
        )}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
      <VoxxyFooter onPlusPress={() => setShowActivityCreation(true)} />
      
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
                
                {/* Saved on date */}
                {selectedFavorite.created_at && (
                  <View style={styles.modalSavedOnSection}>
                    <Text style={styles.modalSavedOnText}>
                      Saved on {new Date(selectedFavorite.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                )}
                
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
    alignItems: 'flex-end',
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