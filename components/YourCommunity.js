// components/YourCommunity.js
import React, { useContext, useState } from 'react'
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Modal,
    ScrollView,
    FlatList,
    StyleSheet,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import SmallTriangle from '../assets/voxxy-triangle.png'
import colors from '../styles/Colors'

export default function YourCommunity({ onInvitePress }) {
    const { user } = useContext(UserContext)
    const [showAll, setShowAll] = useState(false)
    const [selectedPeer, setSelectedPeer] = useState(null)
    if (!user) return null

    const peerMap = new Map()
        ; (user.activities || []).forEach(act =>
            act.participants?.forEach(p => {
                if (p.id === user.id) return
                const e = peerMap.get(p.id) || { user: p, shared: [], lastAct: null }
                e.shared.push(act.activity_name)
                const d = new Date(act.date_day)
                if (!e.lastAct || d > new Date(e.lastAct.date)) {
                    e.lastAct = { name: act.activity_name, date: act.date_day }
                }
                peerMap.set(p.id, e)
            })
        )
    const peers = Array.from(peerMap.values())
    const sorted = peers.sort((a, b) => b.shared.length - a.shared.length)
    const displayed = showAll ? sorted : sorted.slice(0, 4)

    if (sorted.length === 0) {
        return (
            <View style={styles.noContainer}>
                <Image source={SmallTriangle} style={styles.noAvatar} />
                <Text style={styles.noTitle}>No Voxxy Crew Yet</Text>
                <Text style={styles.noSub}>
                    Start an activity and invite friends to build your crew!
                </Text>
                {onInvitePress && (
                    <TouchableOpacity style={styles.button} onPress={onInvitePress}>
                        <Text style={styles.btnText}>Get Started Now</Text>
                    </TouchableOpacity>
                )}
            </View>
        )
    }

    const renderCard = ({ item: entry }) => {
        const firstName = entry.user.name.split(' ')[0]
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedPeer(entry)}
            >
                <Image source={SmallTriangle} style={styles.avatar} />
                <View style={styles.info}>
                    <Text style={styles.name}>{firstName}</Text>
                    <Text style={styles.lastAct} numberOfLines={1}>
                        Last: {entry.lastAct.name}
                    </Text>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Your Community</Text>

            <FlatList
                data={displayed}
                keyExtractor={e => String(e.user.id)}
                numColumns={2}
                renderItem={renderCard}
                contentContainerStyle={styles.grid}
            />

            {sorted.length > 4 && (
                <TouchableOpacity onPress={() => setShowAll(v => !v)}>
                    <Text style={styles.showMore}>
                        {showAll ? 'Show Less' : 'Show All'}
                    </Text>
                </TouchableOpacity>
            )}

            <Modal visible={!!selectedPeer} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setSelectedPeer(null)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{selectedPeer?.user.name}</Text>
                        <Text style={styles.modalEmail}>{selectedPeer?.user.email}</Text>
                        <Text style={styles.modalSubtitle}>
                            Activities you’ve done together:
                        </Text>
                        <ScrollView style={styles.modalList}>
                            {selectedPeer?.shared.map((act, i) => (
                                <Text key={i} style={styles.modalItem}>
                                    • {act}
                                </Text>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    )
}

const CARD_WIDTH_PERCENT = '47%'

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
        paddingBottom: 50,
        backgroundColor: '#201925',
    },
    header: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
    },
    grid: {
        paddingHorizontal: 16,
    },
    card: {
        width: CARD_WIDTH_PERCENT,
        marginHorizontal: '1.5%',
        backgroundColor: '#0f0f14',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.primaryButton,
        marginRight: 10,
        backgroundColor: '#fff',
    },
    info: { flex: 1 },
    name: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 2,
    },
    lastAct: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    showMore: {
        color: '#b931d6',
        textAlign: 'center',
        marginTop: 12,
        fontWeight: '600',
    },

    noContainer: {
        alignItems: 'center',
        padding: 24,
        marginVertical: 24,
    },
    noAvatar: {
        width: 60,
        height: 60,
        marginBottom: 16,
    },
    noTitle: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '600',
        marginBottom: 8,
    },
    noSub: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    button: {
        backgroundColor: colors.primaryButton,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    btnText: {
        color: '#fff',
        fontWeight: '600',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#201925',
        borderRadius: 12,
        padding: 20,
        maxHeight: '60%',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    modalEmail: {
        color: colors.textSecondary,
        fontSize: 14,
        marginBottom: 12,
    },
    modalSubtitle: {
        color: colors.textSecondary,
        fontSize: 14,
        marginBottom: 8,
    },
    modalList: {
        paddingLeft: 8,
    },
    modalItem: {
        color: '#fff',
        marginBottom: 6,
    },
})