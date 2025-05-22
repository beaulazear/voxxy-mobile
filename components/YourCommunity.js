// components/YourCommunity.js
import React, { useContext, useState } from 'react'
import { View, Text, Image, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native'
import { UserContext } from '../context/UserContext'
import SmallTriangle from '../assets/voxxy-triangle.png'
import colors from '../styles/Colors'

export default function YourCommunity({ showInvitePopup, onSelectUser, onInvitePress }) {
    const { user } = useContext(UserContext)
    const [showAll, setShowAll] = useState(false)
    const [selectedPeer, setSelectedPeer] = useState(null)

    if (!user) return null

    const peerMap = new Map()
        ; (user.activities || []).forEach(act => {
            (act.participants || []).forEach(p => {
                if (p.id === user.id) return
                const entry = peerMap.get(p.id) || { user: p, sharedActivities: [], lastAct: null }
                entry.sharedActivities.push(act.activity_name)
                const actDate = new Date(act.date_day)
                if (!entry.lastAct || actDate > new Date(entry.lastAct.date)) {
                    entry.lastAct = { name: act.activity_name, date: act.date_day }
                }
                peerMap.set(p.id, entry)
            })
        })

    const peers = Array.from(peerMap.values())
    const sorted = peers.sort((a, b) => b.sharedActivities.length - a.sharedActivities.length)
    const displayed = showAll ? sorted : sorted.slice(0, 4)

    if (sorted.length === 0) {
        return (
            <View style={styles.noContainer}>
                <Image source={SmallTriangle} style={styles.avatar} />
                <Text style={styles.noTitle}>No Voxxy Crew Yet</Text>
                <Text style={styles.noSub}>Invite friends to start Voxxing together!</Text>
                {onInvitePress && (
                    <TouchableOpacity style={styles.button} onPress={onInvitePress}>
                        <Text style={styles.btnText}>Invite Friends</Text>
                    </TouchableOpacity>
                )}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Your Voxxy Crew 🎭</Text>
            <View style={styles.grid}>
                {displayed.map(entry => (
                    <TouchableOpacity
                        key={entry.user.id}
                        style={styles.card}
                        onPress={() => setSelectedPeer(entry)}
                    >
                        <Image
                            source={SmallTriangle}
                            style={styles.avatar}
                        />
                        <View style={styles.info}>
                            <Text style={styles.name}>{entry.user.name}</Text>
                            <Text style={styles.lastAct}>Last Voxxed: {entry.lastAct.name}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
            {sorted.length > 4 && (
                <TouchableOpacity onPress={() => setShowAll(!showAll)}>
                    <Text style={styles.showMore}>{showAll ? 'Show Less' : 'Show All'}</Text>
                </TouchableOpacity>
            )}

            {/* Peer details modal */}
            <Modal visible={!!selectedPeer} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setSelectedPeer(null)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{selectedPeer?.user.name}</Text>
                        <Text style={styles.modalEmail}>{selectedPeer?.user.email}</Text>
                        <Text style={styles.modalSubtitle}>Activities you've done together:</Text>
                        <ScrollView style={styles.modalList}>
                            {selectedPeer?.sharedActivities.map((act, idx) => (
                                <Text key={idx} style={styles.modalItem}>• {act}</Text>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    header: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: {
        width: '48%',
        backgroundColor: '#201925',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
        elevation: 2,
    },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, borderWidth: 2, borderColor: colors.primaryButton, backgroundColor: '#fff', },
    info: { flex: 1 },
    name: { color: '#fff', fontWeight: '600', fontSize: 16 },
    lastAct: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
    showMore: { color: colors.primaryButton, textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' },

    noContainer: { alignItems: 'center', padding: 24, marginTop: 24 },
    noTitle: { fontSize: 18, color: '#fff', fontWeight: '600', marginTop: 12 },
    noSub: { color: colors.textSecondary, textAlign: 'center', marginVertical: 12 },
    button: { backgroundColor: colors.primaryButton, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    btnText: { color: '#fff', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContent: { backgroundColor: '#201925', borderRadius: 12, padding: 20, maxHeight: '60%' },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
    modalEmail: { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
    modalSubtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
    modalList: {},
    modalItem: { color: '#fff', marginBottom: 4 },
})
