import React, { useState, useContext, useEffect } from 'react'
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    StyleSheet,
    Keyboard,
    Animated,
    Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
    FormStyles,
    GradientButton,
    GradientCard,
    gradientConfigs
} from '../styles/FormStyles'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'

const { width: screenWidth } = Dimensions.get('window')

// Minimalist icon components
const Gamepad = () => <Text style={styles.miniIcon}>🎮</Text>
const Monitor = () => <Text style={styles.miniIcon}>🖥️</Text>
const Dice = () => <Text style={styles.miniIcon}>🎲</Text>
const Target = () => <Text style={styles.miniIcon}>🎯</Text>
const Heart = () => <Text style={styles.miniIcon}>❤️</Text>
const Trophy = () => <Text style={styles.miniIcon}>🏆</Text>
const Timer = () => <Text style={styles.miniIcon}>⏰</Text>
const Smile = () => <Text style={styles.miniIcon}>😊</Text>
const Plus = () => <Text style={styles.miniIcon}>+</Text>
const Calendar = () => <Text style={styles.miniIcon}>📅</Text>
const Clock = () => <Text style={styles.miniIcon}>🕐</Text>
const Users = () => <Text style={styles.miniIcon}>👥</Text>
const X = () => <Text style={styles.miniIcon}>×</Text>
const Message = () => <Text style={styles.miniIcon}>💬</Text>

export default function GameNightResponseForm({
    visible,
    onClose,
    activityId,
    onResponseComplete,
    guestMode = false,
    guestToken = null,
    guestEmail = null,
    guestActivity = null
}) {
    const { user, setUser } = useContext(UserContext)
    const [step, setStep] = useState(1)
    const [activity, setActivity] = useState(guestActivity)
    const [fadeAnim] = useState(new Animated.Value(0))

    // Dynamic total steps based on whether availability is needed
    const getTotalSteps = () => {
        return activity?.allow_participant_time_selection ? 10 : 9
    }

    const percent = (step / getTotalSteps()) * 100

    // Form state
    const [gameType, setGameType] = useState('')
    const [consoles, setConsoles] = useState([])
    const [traditionalGames, setTraditionalGames] = useState([])
    const [customGames, setCustomGames] = useState([])
    const [newGameInput, setNewGameInput] = useState('')
    const [gameGenres, setGameGenres] = useState([])
    const [playStyle, setPlayStyle] = useState('')
    const [competitiveness, setCompetitiveness] = useState('')
    const [duration, setDuration] = useState(60)
    const [atmosphere, setAtmosphere] = useState('')
    const [experienceLevel, setExperienceLevel] = useState('')
    const [additionalNotes, setAdditionalNotes] = useState('')
    const [availability, setAvailability] = useState({})
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTimes, setSelectedTimes] = useState([])

    // Game night options
    const gameTypeOptions = [
        { label: 'Video Games', emoji: '🎮', desc: 'Console, PC, mobile' },
        { label: 'Board Games', emoji: '🎲', desc: 'Traditional tabletop' },
        { label: 'Card Games', emoji: '🃏', desc: 'Playing cards, etc.' },
        { label: 'Open to All', emoji: '✨', desc: 'Any type of game' }
    ]

    const consoleOptions = [
        { label: 'PlayStation 5', emoji: '🎮' },
        { label: 'PlayStation 4', emoji: '🎮' },
        { label: 'Xbox Series X/S', emoji: '🎮' },
        { label: 'Xbox One', emoji: '🎮' },
        { label: 'Nintendo Switch', emoji: '🎮' },
        { label: 'PC Gaming', emoji: '💻' },
        { label: 'Steam Deck', emoji: '🎮' },
        { label: 'Mobile Games', emoji: '📱' },
        { label: 'Retro Consoles', emoji: '🕹️' },
        { label: 'None Available', emoji: '❌' }
    ]

    const traditionalGameOptions = [
        { label: 'Classic Board Games', emoji: '🎲' },
        { label: 'Strategy Board Games', emoji: '♟️' },
        { label: 'Party Board Games', emoji: '🎉' },
        { label: 'Card Games (Poker, etc.)', emoji: '🃏' },
        { label: 'Jackbox Games', emoji: '📺' },
        { label: 'Trivia Games', emoji: '🧠' },
        { label: 'Puzzle Games', emoji: '🧩' },
        { label: 'Cooperative Games', emoji: '🤝' },
        { label: 'Role-Playing Games', emoji: '⚔️' }
    ]

    const genreOptions = [
        { label: 'Strategy', emoji: '♟️' },
        { label: 'Party Games', emoji: '🎉' },
        { label: 'Cooperative', emoji: '🤝' },
        { label: 'Competitive', emoji: '🏆' },
        { label: 'Card Games', emoji: '🃏' },
        { label: 'Trivia & Quizzes', emoji: '❓' },
        { label: 'Puzzle Games', emoji: '🧩' },
        { label: 'Action Games', emoji: '⚡' },
        { label: 'Role-Playing', emoji: '⚔️' },
        { label: 'Social Deduction', emoji: '🕵️' },
        { label: 'Word Games', emoji: '📝' },
        { label: 'Drawing Games', emoji: '🎨' }
    ]

    const playStyleOptions = [
        { label: 'Work Together', emoji: '🤝', desc: 'Cooperative games' },
        { label: 'Friendly Competition', emoji: '😊', desc: 'Light competitive fun' },
        { label: 'Mix of Both', emoji: '⚖️', desc: 'Variety throughout night' }
    ]

    const competitivenessOptions = [
        { label: 'Casual and Relaxed', emoji: '😌', desc: 'Just for fun' },
        { label: 'Moderately Competitive', emoji: '🎯', desc: 'We like to win' },
        { label: 'Highly Competitive', emoji: '🔥', desc: 'Victory at all costs' }
    ]

    const atmosphereOptions = [
        { label: 'High Energy', emoji: '⚡', desc: 'Fast-paced & exciting' },
        { label: 'Chill and Relaxed', emoji: '😎', desc: 'Laid-back vibes' },
        { label: 'Focused and Strategic', emoji: '🧠', desc: 'Deep thinking games' }
    ]

    const experienceOptions = [
        { label: 'Beginner Friendly', emoji: '🌱', desc: 'New to gaming' },
        { label: 'Intermediate', emoji: '🎯', desc: 'Some gaming experience' },
        { label: 'Advanced', emoji: '🏆', desc: 'Experienced gamers' },
        { label: 'Mixed Skill Levels', emoji: '🌈', desc: 'Variety in our group' }
    ]

    // Duration options to replace the slider
    const durationOptions = [
        { value: 30, label: '30 minutes', emoji: '⏱️' },
        { value: 60, label: '1 hour', emoji: '🕐' },
        { value: 90, label: '1.5 hours', emoji: '🕐' },
        { value: 120, label: '2 hours', emoji: '🕑' },
        { value: 150, label: '2.5 hours', emoji: '🕑' },
        { value: 180, label: '3 hours', emoji: '🕒' },
        { value: 240, label: '4+ hours', emoji: '🕓' }
    ]

    // Evening time slots for game nights
    const timeSlots = [
        '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
        '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'
    ]

    // Animate step transitions
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }, [step])

    // Fetch activity data
    useEffect(() => {
        if (guestMode && guestActivity) {
            setActivity(guestActivity)
            return
        }

        const fetchActivity = async () => {
            try {
                const response = await fetch(`${API_URL}/activities/${activityId}`, {
                    credentials: guestMode ? 'omit' : 'include'
                })
                const data = await response.json()

                let foundActivity = null
                if (data.participant_activities) {
                    foundActivity = data.participant_activities.find(pa => pa.id === parseInt(activityId))
                }
                if (!foundActivity && data.activities) {
                    foundActivity = data.activities.find(act => act.id === parseInt(activityId))
                }
                setActivity(foundActivity || data)
            } catch (error) {
                console.error('Error fetching activity:', error)
            }
        }

        fetchActivity()
    }, [activityId, guestMode, guestActivity])

    // Step content
    const getStepContent = () => {
        switch (step) {
            case 1:
                return {
                    title: 'Game Type Preference',
                    subtitle: 'What type of games interest you most?'
                }
            case 2:
                return {
                    title: 'Gaming Platforms',
                    subtitle: 'Which consoles or platforms do you have?'
                }
            case 3:
                return {
                    title: 'Game Collection',
                    subtitle: 'What games do you own or want to try?'
                }
            case 4:
                return {
                    title: 'Favorite Genres',
                    subtitle: 'What game styles do you enjoy?'
                }
            case 5:
                return {
                    title: 'Play Style',
                    subtitle: 'How do you prefer to play?'
                }
            case 6:
                return {
                    title: 'Competitiveness',
                    subtitle: 'How competitive is your group?'
                }
            case 7:
                return {
                    title: 'Session & Atmosphere',
                    subtitle: 'How long and what vibe?'
                }
            case 8:
                return {
                    title: 'Experience Level',
                    subtitle: "What's your group's gaming level?"
                }
            case 9:
                return {
                    title: 'Additional Preferences',
                    subtitle: 'Any special requests or notes?'
                }
            case 10:
                return {
                    title: 'Your Availability',
                    subtitle: 'When can you join the game night?'
                }
            default:
                return { title: '', subtitle: '' }
        }
    }

    // Handlers
    const toggleMultiSelect = (item, currentArray, setter) => {
        if (currentArray.includes(item)) {
            setter(currentArray.filter(i => i !== item))
        } else {
            setter([...currentArray, item])
        }
    }

    const addCustomGame = () => {
        const trimmed = newGameInput.trim()
        if (!trimmed || customGames.includes(trimmed)) return
        setCustomGames([...customGames, trimmed])
        setNewGameInput('')
        Keyboard.dismiss()
    }

    const removeCustomGame = (gameToRemove) => {
        setCustomGames(customGames.filter(game => game !== gameToRemove))
    }

    const formatDuration = (minutes) => {
        if (minutes < 60) return `${minutes} minutes`
        if (minutes === 60) return '1 hour'
        if (minutes < 120) return `${minutes} minutes`
        if (minutes === 120) return '2 hours'
        if (minutes === 180) return '3 hours'
        if (minutes === 240) return '4+ hours'
        return `${Math.floor(minutes / 60)} hours`
    }

    // Availability handlers
    const handleDateChange = (date) => {
        setSelectedDate(date)
        setSelectedTimes(availability[date] || [])
    }

    const handleTimeToggle = (time) => {
        const newTimes = selectedTimes.includes(time)
            ? selectedTimes.filter(t => t !== time)
            : [...selectedTimes, time]
        setSelectedTimes(newTimes)
    }

    const addAvailability = () => {
        if (selectedDate && selectedTimes.length > 0) {
            setAvailability(prev => ({
                ...prev,
                [selectedDate]: selectedTimes
            }))
            setSelectedDate('')
            setSelectedTimes([])
        }
    }

    const removeAvailability = (date) => {
        setAvailability(prev => {
            const newAvailability = { ...prev }
            delete newAvailability[date]
            return newAvailability
        })
    }

    const removePill = (item, setter) => {
        setter(prev => prev.filter(i => i !== item))
    }

    // Validation
    const isNextDisabled = () => {
        switch (step) {
            case 1: return gameType === ''
            case 2: return false // Optional
            case 3: return false // Optional
            case 4: return gameGenres.length === 0
            case 5: return playStyle === ''
            case 6: return competitiveness === ''
            case 7: return atmosphere === ''
            case 8: return experienceLevel === ''
            case 9: return false // Optional
            case 10: return activity?.allow_participant_time_selection && Object.keys(availability).length === 0
            default: return false
        }
    }

    // Navigation
    const handleNext = () => {
        const totalSteps = getTotalSteps()
        if (step < totalSteps) {
            fadeAnim.setValue(0)
            setStep(step + 1)
        } else {
            handleSubmit()
        }
    }

    const handleBack = () => {
        if (step > 1) {
            fadeAnim.setValue(0)
            setStep(step - 1)
        }
    }

    // Submission
    const handleSubmit = async () => {
        // Compile custom games with traditional games
        const allTraditionalGames = [...traditionalGames]
        if (customGames.length > 0) {
            allTraditionalGames.push(`Custom Games: ${customGames.join(', ')}`)
        }

        const gameTypeText = gameType
        const consolesText = consoles.length > 0 ? consoles.join(', ') : 'None specified'
        const gamesText = allTraditionalGames.length > 0 ? allTraditionalGames.join(', ') : 'Open to suggestions'
        const genresText = gameGenres.join(', ')
        const notesText = additionalNotes || 'No additional preferences'

        const notes = `Game Night Preferences:
🎮 Game Type: ${gameTypeText}
🖥️ Consoles Available: ${consolesText}
🎲 Traditional Games: ${gamesText}
🎯 Favorite Genres: ${genresText}
🤝 Play Style: ${playStyle}
🏆 Competitiveness: ${competitiveness}
⏱️ Preferred Duration: ${formatDuration(duration)}
🌟 Atmosphere: ${atmosphere}
📊 Experience Level: ${experienceLevel}
💭 Additional Notes: ${notesText}`.trim()

        try {
            let endpoint, requestOptions

            if (guestMode) {
                endpoint = `${API_URL}/activities/${activityId}/respond/${guestToken}`
                requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        response: {
                            notes,
                            ...(activity?.allow_participant_time_selection && { availability })
                        },
                    }),
                }
            } else {
                endpoint = `${API_URL}/responses`
                requestOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.token}`,
                    },
                    body: JSON.stringify({
                        response: {
                            notes,
                            activity_id: activityId,
                            ...(activity?.allow_participant_time_selection && { availability })
                        },
                    }),
                }
            }

            const res = await fetch(endpoint, requestOptions)

            if (!res.ok) {
                const errorData = await res.json()
                console.error('❌ Failed to save response:', errorData)
                Alert.alert('Error', 'Failed to submit response. Please try again.')
                return
            }

            const data = await res.json()

            // Update user state for authenticated users
            if (!guestMode && user) {
                const { response: newResponse, comment: newComment } = data

                setUser(prev => {
                    const activities = prev.activities.map(act => {
                        if (act.id === activityId) {
                            const filteredResponses = (act.responses || []).filter(
                                response => response.user_id !== user.id
                            )
                            const filteredComments = (act.comments || []).filter(
                                comment => comment.user_id !== user.id
                            )

                            return {
                                ...act,
                                responses: [...filteredResponses, newResponse],
                                comments: [...filteredComments, newComment],
                            }
                        }
                        return act
                    })

                    const participant_activities = prev.participant_activities.map(pa => {
                        if (pa.activity.id === activityId) {
                            const filteredResponses = (pa.activity.responses || []).filter(
                                response => response.user_id !== user.id
                            )
                            const filteredComments = (pa.activity.comments || []).filter(
                                comment => comment.user_id !== user.id
                            )

                            return {
                                ...pa,
                                activity: {
                                    ...pa.activity,
                                    responses: [...filteredResponses, newResponse],
                                    comments: [...filteredComments, newComment],
                                },
                            }
                        }
                        return pa
                    })

                    return {
                        ...prev,
                        activities,
                        participant_activities,
                    }
                })

                if (onResponseComplete) {
                    onResponseComplete(newResponse, newComment)
                }
            } else if (onResponseComplete) {
                onResponseComplete()
            }

            Alert.alert('Success!', 'Your game night preferences have been submitted!')
            onClose()

        } catch (error) {
            console.error('❌ Error submitting response:', error)
            Alert.alert('Error', 'Failed to submit response. Please try again.')
        }
    }

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        { width: `${percent}%` }
                    ]}
                />
            </View>
            <Text style={styles.progressText}>
                {step} of {getTotalSteps()}
            </Text>
        </View>
    )

    const renderCompactPill = (item, onRemove) => (
        <View key={item} style={styles.compactPill}>
            <Text style={styles.compactPillText}>{item}</Text>
            <TouchableOpacity
                onPress={() => onRemove(item)}
                style={styles.compactPillRemove}
            >
                <X />
            </TouchableOpacity>
        </View>
    )

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {gameTypeOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        gameType === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setGameType(option.label)}
                                >
                                    <Text style={styles.singleSelectEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        gameType === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 2:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.compactGrid}>
                            {consoleOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.compactCard,
                                        consoles.includes(option.label) && styles.compactCardSelected
                                    ]}
                                    onPress={() => toggleMultiSelect(option.label, consoles, setConsoles)}
                                >
                                    <Text style={styles.compactEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.compactLabel,
                                        consoles.includes(option.label) && styles.compactLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {consoles.length > 0 && (
                            <View style={styles.selectedContainer}>
                                <Text style={styles.selectedTitle}>Selected:</Text>
                                <View style={styles.compactPillContainer}>
                                    {consoles.map(console =>
                                        renderCompactPill(console, (item) => removePill(item, setConsoles))
                                    )}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )

            case 3:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.compactGrid}>
                            {traditionalGameOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.compactCard,
                                        traditionalGames.includes(option.label) && styles.compactCardSelected
                                    ]}
                                    onPress={() => toggleMultiSelect(option.label, traditionalGames, setTraditionalGames)}
                                >
                                    <Text style={styles.compactEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.compactLabel,
                                        traditionalGames.includes(option.label) && styles.compactLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.customGameSection}>
                            <Text style={styles.customGameTitle}>Specific Games You Own or Want to Play</Text>
                            <View style={styles.customInputRow}>
                                <TextInput
                                    style={styles.customInput}
                                    placeholder={gameType === 'Video Games' ?
                                        "e.g., Mario Kart, Among Us, Rocket League..." :
                                        "e.g., Codenames, Ticket to Ride, Uno, Monopoly..."}
                                    placeholderTextColor="#999"
                                    value={newGameInput}
                                    onChangeText={setNewGameInput}
                                    returnKeyType="done"
                                    onSubmitEditing={addCustomGame}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.customAddButton,
                                        !newGameInput.trim() && styles.customAddButtonDisabled
                                    ]}
                                    onPress={addCustomGame}
                                    disabled={!newGameInput.trim()}
                                >
                                    <Plus />
                                </TouchableOpacity>
                            </View>

                            {customGames.length > 0 && (
                                <View style={styles.customGamesList}>
                                    {customGames.map((game, index) => (
                                        <View key={index} style={styles.customGameItem}>
                                            <Text style={styles.customGameText}>{game}</Text>
                                            <TouchableOpacity
                                                style={styles.removeGameButton}
                                                onPress={() => removeCustomGame(game)}
                                            >
                                                <X />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        {traditionalGames.length > 0 && (
                            <View style={styles.selectedContainer}>
                                <Text style={styles.selectedTitle}>Selected Categories:</Text>
                                <View style={styles.compactPillContainer}>
                                    {traditionalGames.map(game =>
                                        renderCompactPill(game, (item) => removePill(item, setTraditionalGames))
                                    )}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )

            case 4:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.compactGrid}>
                            {genreOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.compactCard,
                                        gameGenres.includes(option.label) && styles.compactCardSelected
                                    ]}
                                    onPress={() => toggleMultiSelect(option.label, gameGenres, setGameGenres)}
                                >
                                    <Text style={styles.compactEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.compactLabel,
                                        gameGenres.includes(option.label) && styles.compactLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {gameGenres.length > 0 && (
                            <View style={styles.selectedContainer}>
                                <Text style={styles.selectedTitle}>Selected:</Text>
                                <View style={styles.compactPillContainer}>
                                    {gameGenres.map(genre =>
                                        renderCompactPill(genre, (item) => removePill(item, setGameGenres))
                                    )}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )

            case 5:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {playStyleOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        playStyle === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setPlayStyle(option.label)}
                                >
                                    <Text style={styles.singleSelectEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        playStyle === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 6:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {competitivenessOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        competitiveness === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setCompetitiveness(option.label)}
                                >
                                    <Text style={styles.singleSelectEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        competitiveness === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 7:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <Text style={styles.sectionSubtitle}>Preferred Session Length:</Text>
                        <View style={styles.durationGrid}>
                            {durationOptions.map(option => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.durationCard,
                                        duration === option.value && styles.durationCardSelected
                                    ]}
                                    onPress={() => setDuration(option.value)}
                                >
                                    <Text style={styles.durationEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.durationLabel,
                                        duration === option.value && styles.durationLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionSubtitle}>What atmosphere do you prefer?</Text>
                        <View style={styles.singleSelectGrid}>
                            {atmosphereOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        atmosphere === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setAtmosphere(option.label)}
                                >
                                    <Text style={styles.singleSelectEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        atmosphere === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 8:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {experienceOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        experienceLevel === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setExperienceLevel(option.label)}
                                >
                                    <Text style={styles.singleSelectEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        experienceLevel === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 9:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <TextInput
                            style={styles.notesInput}
                            placeholder="Tell us about any specific games you want to play, snack preferences, accessibility needs, or anything else that would make this the perfect game night..."
                            placeholderTextColor="#999"
                            value={additionalNotes}
                            onChangeText={setAdditionalNotes}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                    </Animated.View>
                )

            case 10:
                if (!activity?.allow_participant_time_selection) return null

                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.dateSection}>
                            <Text style={styles.sectionLabel}>Select Date</Text>
                            <TextInput
                                style={styles.dateInput}
                                value={selectedDate}
                                onChangeText={handleDateChange}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#999"
                            />
                        </View>

                        {selectedDate && (
                            <>
                                <View style={styles.timeSection}>
                                    <Text style={styles.sectionLabel}>
                                        Available Times ({new Date(selectedDate).toLocaleDateString()})
                                    </Text>
                                    <View style={styles.timeGrid}>
                                        {timeSlots.map(time => (
                                            <TouchableOpacity
                                                key={time}
                                                style={[
                                                    styles.timeChip,
                                                    selectedTimes.includes(time) && styles.timeChipSelected
                                                ]}
                                                onPress={() => handleTimeToggle(time)}
                                            >
                                                <Text style={[
                                                    styles.timeChipText,
                                                    selectedTimes.includes(time) && styles.timeChipTextSelected
                                                ]}>
                                                    {time}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {selectedTimes.length > 0 && (
                                        <TouchableOpacity
                                            style={styles.addTimeButton}
                                            onPress={addAvailability}
                                        >
                                            <Text style={styles.addTimeText}>
                                                Add Date ({selectedTimes.length} times)
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}

                        {Object.keys(availability).length > 0 && (
                            <View style={styles.availabilitySection}>
                                <Text style={styles.sectionLabel}>Your Availability</Text>
                                {Object.entries(availability).map(([date, times]) => (
                                    <View key={date} style={styles.availabilityItem}>
                                        <View style={styles.availabilityInfo}>
                                            <Text style={styles.availabilityDate}>
                                                {new Date(date).toLocaleDateString()}
                                            </Text>
                                            <Text style={styles.availabilityTimes}>
                                                {times.join(', ')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeAvailability(date)}
                                        >
                                            <X />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </Animated.View>
                )

            default:
                return null
        }
    }

    const { title, subtitle } = getStepContent()

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {renderProgressBar()}

                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.backButton, step === 1 && styles.backButtonDisabled]}
                        onPress={step > 1 ? handleBack : null}
                        disabled={step === 1}
                    >
                        <Text style={[styles.backButtonText, step === 1 && styles.backButtonTextDisabled]}>
                            Back
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.nextButton, isNextDisabled() && styles.nextButtonDisabled]}
                        onPress={handleNext}
                        disabled={isNextDisabled()}
                    >
                        <LinearGradient
                            colors={['#cc31e8', '#9b1dbd']}
                            style={styles.nextButtonGradient}
                        >
                            <Text style={styles.nextButtonText}>
                                {step < getTotalSteps() ? 'Next' : 'Submit'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },

    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
    },

    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#cc31e8',
        borderRadius: 3,
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },

    progressText: {
        color: '#cc31e8',
        fontSize: 12,
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'right',
    },

    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },

    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },

    subtitle: {
        fontSize: 16,
        color: '#999',
        lineHeight: 22,
    },

    content: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },

    stepContainer: {
        flex: 1,
    },

    compactGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginHorizontal: -4,
        marginBottom: 20,
    },

    compactCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        width: (screenWidth - 64) / 3,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 75,
        marginHorizontal: 4,
        marginBottom: 8,
    },

    compactCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    compactEmoji: {
        fontSize: 20,
        marginBottom: 4,
    },

    compactLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 14,
    },

    compactLabelSelected: {
        color: '#cc31e8',
    },

    singleSelectGrid: {
        gap: 12,
    },

    singleSelectCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },

    singleSelectCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    singleSelectEmoji: {
        fontSize: 24,
        marginBottom: 8,
    },

    singleSelectLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },

    singleSelectLabelSelected: {
        color: '#cc31e8',
    },

    singleSelectDesc: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },

    customGameSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },

    customGameTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cc31e8',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    customInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },

    customInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
    },

    customAddButton: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 8,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    customAddButtonDisabled: {
        opacity: 0.5,
    },

    customGamesList: {
        gap: 6,
    },

    customGameItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 12,
        borderRadius: 8,
    },

    customGameText: {
        color: '#fff',
        fontSize: 14,
        flex: 1,
    },

    removeGameButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.2)',
        borderRadius: 4,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    selectedContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
    },

    selectedTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#cc31e8',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    compactPillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },

    compactPill: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    compactPillText: {
        color: '#cc31e8',
        fontSize: 12,
        fontWeight: '500',
    },

    compactPillRemove: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'rgba(204, 49, 232, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },

    durationCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        minWidth: (screenWidth - 72) / 3,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 60,
    },

    durationCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    durationEmoji: {
        fontSize: 18,
        marginBottom: 4,
    },

    durationLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 14,
    },

    durationLabelSelected: {
        color: '#cc31e8',
    },

    sectionSubtitle: {
        fontSize: 16,
        color: '#999',
        marginBottom: 16,
        textAlign: 'center',
    },

    notesInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
    },

    dateSection: {
        marginBottom: 20,
    },

    timeSection: {
        marginBottom: 20,
    },

    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cc31e8',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    dateInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
    },

    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },

    timeChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },

    timeChipSelected: {
        backgroundColor: '#cc31e8',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },

    timeChipText: {
        color: '#ccc',
        fontSize: 11,
        fontWeight: '500',
    },

    timeChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },

    addTimeButton: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },

    addTimeText: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '600',
    },

    availabilitySection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
    },

    availabilityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 6,
    },

    availabilityInfo: {
        flex: 1,
    },

    availabilityDate: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },

    availabilityTimes: {
        color: '#ccc',
        fontSize: 12,
    },

    removeButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.2)',
        borderRadius: 4,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 8,
    },

    closeButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255, 69, 69, 0.3)',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },

    closeButtonText: {
        color: '#ff4545',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },

    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },

    backButtonDisabled: {
        opacity: 0.5,
    },

    backButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },

    backButtonTextDisabled: {
        color: '#666',
    },

    nextButton: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },

    nextButtonDisabled: {
        opacity: 0.5,
    },

    nextButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },

    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    miniIcon: {
        fontSize: 12,
        color: '#cc31e8',
    },
})