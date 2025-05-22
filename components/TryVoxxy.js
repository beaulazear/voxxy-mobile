// components/TryVoxxy.js

import React, { useState, useEffect, useRef } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    Alert,
} from 'react-native'

export default function TryVoxxy() {
    // ── State ─────────────────────────────────────────────────────
    const [recs, setRecs] = useState([])
    const [loadingRecs, setLoadingRecs] = useState(true)

    const [planVisible, setPlanVisible] = useState(false)
    const [loc, setLoc] = useState('')
    const [usingCur, setUsingCur] = useState(false)
    const [coords, setCoords] = useState(null)
    const [fetchingLoc, setFetchingLoc] = useState(false)

    const [note, setNote] = useState('')
    const outingOptions = ['Brunch', 'Lunch', 'Dinner', 'Late-night drinks']

    const [chatVisible, setChatVisible] = useState(false)
    const [showLoader, setShowLoader] = useState(false)

    const [detailRec, setDetailRec] = useState(null)
    const [signupVisible, setSignupVisible] = useState(false)

    const questions = [
        "What’s the food & drink mood?",
        "Any deal‑breakers? (e.g. no pizza)",
        "What’s the vibe? (fancy, casual…)",
        "Budget range? (low, mid, high)",
    ]
    const [messages, setMessages] = useState([
        { text: "Hey there! Voxxy here—let's vibe check your outing!", me: false },
    ])
    const [answers, setAnswers] = useState([])
    const [step, setStep] = useState(0)
    const [input, setInput] = useState('')
    const [typing, setTyping] = useState(false)

    const chatScroll = useRef()
    const sessionToken = useRef(Date.now().toString()).current

    // ── Effects ────────────────────────────────────────────────────
    useEffect(() => {
        fetch(`https://your-api.com/try_voxxy_cached?session_token=${sessionToken}`)
            .then(r => r.json())
            .then(d => setRecs(d.recommendations || []))
            .catch(() => { })
            .finally(() => setLoadingRecs(false))
    }, [])

    useEffect(() => {
        setTyping(true)
        const t = setTimeout(() => {
            setMessages(m => [...m, { text: questions[0], me: false }])
            setTyping(false)
        }, 800)
        return () => clearTimeout(t)
    }, [])

    useEffect(() => {
        if (!showLoader) return
            ; (async () => {
                const payload = answers.map(x => `${x.q}\nAnswer: ${x.a}`).join('\n\n')
                try {
                    const res = await fetch('https://your-api.com/try_voxxy_recommendations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Session-Token': sessionToken,
                        },
                        body: JSON.stringify({
                            responses: payload,
                            activity_location: usingCur && coords ? coords : loc,
                            date_notes: note,
                        }),
                    })
                    const data = await res.json()
                    setRecs(data.recommendations || [])
                } catch { }
                setShowLoader(false)
                setChatVisible(false)
            })()
    }, [showLoader])

    useEffect(() => {
        chatScroll.current?.scrollToEnd({ animated: true })
    }, [messages, typing])

    // ── Handlers ───────────────────────────────────────────────────
    function openPlan() { setPlanVisible(true) }
    function useCurrentLocation() {
        if (!navigator.geolocation) return
        if (usingCur) {
            // clear
            setUsingCur(false)
            setLoc('')
            return
        }
        setFetchingLoc(true)
        navigator.geolocation.getCurrentPosition(
            ({ coords: c }) => {
                setCoords({ lat: c.latitude, lng: c.longitude })
                setUsingCur(true)
                setLoc('Using current location')
                setFetchingLoc(false)
            },
            () => {
                setFetchingLoc(false)
                Alert.alert('Error', 'Unable to fetch location')
            }
        )
    }
    function submitPlan() {
        if (!loc.trim() || !note) return
        setPlanVisible(false)
        setChatVisible(true)
    }
    function handleNext() {
        if (!input.trim()) return
        setMessages(m => [...m, { text: input, me: true }])
        setAnswers(a => [...a, { q: questions[step], a: input }])
        setInput('')
        const nxt = step + 1
        if (nxt < questions.length) {
            setStep(nxt)
            setTyping(true)
            setTimeout(() => {
                setMessages(m => [...m, { text: questions[nxt], me: false }])
                setTyping(false)
            }, 800)
        } else {
            setMessages(m => [...m, { text: 'Fetching recommendations…', me: false }])
            setShowLoader(true)
        }
    }

    // ── Render ─────────────────────────────────────────────────────
    return (
        <SafeAreaView style={s.container}>
            <ScrollView contentContainerStyle={s.inner}>
                <Text style={s.header}>Try <Text style={s.highlight}>Voxxy</Text> Today</Text>
                <Text style={s.sub}>
                    {recs.length
                        ? 'Tap a recommendation for details or refresh below.'
                        : !loadingRecs
                            ? 'Start the quiz to get group‑meal recommendations!'
                            : ''}
                </Text>

                {recs.length > 0 ? (
                    <>
                        <View style={s.row}>
                            <TouchableOpacity style={s.btn} onPress={() => setSignupVisible(true)}>
                                <Text style={s.btnText}>🔄 Refresh</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={recs}
                            keyExtractor={(_, i) => i.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={s.rec} onPress={() => setDetailRec(item)}>
                                    <Text style={s.recName}>{item.name}</Text>
                                    <Text style={s.recMeta}>{item.price_range}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </>
                ) : (
                    !loadingRecs && (
                        <View style={s.card}>
                            <Text style={s.icon}>📅</Text>
                            <Text style={s.cardText}>Plan a Group Visit</Text>
                            <TouchableOpacity style={s.btn} onPress={openPlan}>
                                <Text style={s.btnText}>▶ Start Quiz</Text>
                            </TouchableOpacity>
                        </View>
                    )
                )}
            </ScrollView>

            {/* Plan Modal */}
            <Modal visible={planVisible} transparent animationType="fade">
                <View style={s.modalBg}>
                    <View style={s.modal}>
                        <TouchableOpacity style={s.close} onPress={() => setPlanVisible(false)}>
                            <Text style={s.closeTxt}>✖</Text>
                        </TouchableOpacity>

                        <Text style={s.label}>Location</Text>
                        <TextInput
                            style={s.input}
                            placeholder="City or zip"
                            placeholderTextColor="#888"
                            value={loc}
                            onChangeText={t => { setLoc(t); setUsingCur(false) }}
                        />
                        <TouchableOpacity
                            style={[s.smallBtn, usingCur && s.smallBtnActive]}
                            onPress={useCurrentLocation}
                            disabled={fetchingLoc}
                        >
                            {fetchingLoc
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={s.smallBtnTxt}>
                                    {usingCur ? 'Clear Current' : 'Use Current'}
                                </Text>
                            }
                        </TouchableOpacity>

                        <Text style={[s.label, { marginTop: 16 }]}>Outing Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                            {outingOptions.map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[s.chip, note === opt && s.chipSelected]}
                                    onPress={() => setNote(opt)}
                                >
                                    <Text style={[s.chipText, note === opt && s.chipTextSelected]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[s.btn, { opacity: loc && note ? 1 : 0.5 }]}
                            onPress={submitPlan}
                            disabled={!(loc && note)}
                        >
                            <Text style={s.btnText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Chat, Detail & Signup modals unchanged */}
            {/* … */}
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f14' },
    inner: { padding: 24, paddingBottom: 0 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
    highlight: { color: '#B931D6' },
    sub: { fontSize: 16, color: '#bbb', textAlign: 'center', marginTop: 8 },
    row: { flexDirection: 'row', justifyContent: 'center', marginVertical: 16 },
    btn: { backgroundColor: '#9d60f8', padding: 12, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: '600' },
    rec: { backgroundColor: '#1a1a27', padding: 16, borderRadius: 8, marginVertical: 6 },
    recName: { color: '#fff', fontWeight: '600', fontSize: 16 },
    recMeta: { color: '#bbb', fontSize: 14, marginTop: 4 },
    card: { alignItems: 'center', marginTop: 32 },
    icon: { fontSize: 40, marginBottom: 12, color: '#9d60f8' },
    cardText: { color: '#ccc', fontSize: 18, marginBottom: 12 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modal: { backgroundColor: '#1a1a27', padding: 20, width: '85%', borderRadius: 8 },

    close: { position: 'absolute', top: 10, right: 10 },
    closeTxt: { fontSize: 18, color: '#bbb' },

    label: { fontSize: 14, color: '#bbb', marginBottom: 4 },
    input: { backgroundColor: '#262635', color: '#fff', padding: 8, borderRadius: 4, marginBottom: 12 },

    smallBtn: { alignSelf: 'flex-start', padding: 6, borderRadius: 4, backgroundColor: '#444' },
    smallBtnActive: { backgroundColor: '#9d60f8' },
    smallBtnTxt: { color: '#fff' },

    chip: {
        borderWidth: 1, borderColor: '#9d60f8',
        borderRadius: 16, paddingVertical: 6,
        paddingHorizontal: 12, marginRight: 8,
    },
    chipSelected: { backgroundColor: '#9d60f8' },
    chipText: { color: '#9d60f8', fontSize: 14 },
    chipTextSelected: { color: '#fff' },

    // ... keep your chat/detail/signup styles unchanged ...
})