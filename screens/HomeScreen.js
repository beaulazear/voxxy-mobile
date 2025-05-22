// screens/HomeScreen.js
import React, { useContext, useMemo, useState } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import YourCommunity from '../components/YourCommunity'
import VoxxyFooter from '../components/VoxxyFooter'

const FILTERS = ['All', 'Upcoming', 'Past']
const PREVIEW_COUNT = 3

export default function HomeScreen() {
  const { user } = useContext(UserContext)
  const [filter, setFilter] = useState('Upcoming')
  const [showAll, setShowAll] = useState(false)
  const [showInvitePopup, setShowInvitePopup] = useState(false)

  // Gather & dedupe activities
  const allActivities = useMemo(() => {
    if (!user) return []
    const mine = user.activities || []
    const theirs = user.participant_activities
      ?.filter(p => p.accepted)
      .map(p => p.activity) || []
    const combined = [...mine, ...theirs]
    return [...new Map(combined.map(a => [a.id, a])).values()]
  }, [user])

  // Buckets
  const now = new Date()
  const upcoming = allActivities.filter(a => {
    if (!a.finalized || a.completed || !a.date_day) return false
    const [Y, M, D] = a.date_day.split('-').map(Number)
    return new Date(Y, M - 1, D) >= now
  })
  const past = allActivities.filter(a => a.completed)

  // Filtered + sorted data
  const data = useMemo(() => {
    const sortByDate = arr =>
      arr.slice().sort((a, b) => new Date(a.date_day) - new Date(b.date_day))
    switch (filter) {
      case 'Upcoming':
        return sortByDate(upcoming)
      case 'Past':
        return sortByDate(past)
      default:
        return sortByDate(allActivities)
    }
  }, [filter, allActivities, upcoming, past])

  const openWebBoard = id =>
    Linking.openURL(`https://www.voxxyai.com/boards/${id}`)

  function renderActivity(item) {
    const [Y, M, D] = item.date_day?.split('-').map(Number) || []
    const dateStr = item.date_day
      ? new Date(Y, M - 1, D).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      : 'TBD'
    const count = (item.participants?.length || 0) + 1

    return (
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardName}>{item.activity_name}</Text>
        <Text style={styles.cardMeta}>
          {item.emoji} {item.activity_type} · {count} ppl
        </Text>
        <Text style={styles.cardMeta}>{dateStr}</Text>
        <TouchableOpacity onPress={() => openWebBoard(item.id)}>
          <Text style={styles.cardLink}>Visit Board on Voxxy Web →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // decide which slice to render
  const previewData = showAll ? data : data.slice(0, PREVIEW_COUNT)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header & Filters */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            Welcome to <Text style={styles.highlight}>Voxxy</Text>
          </Text>
          <Text style={styles.subtitle}>
            Our very first iOS beta launch! 🎉 Super bare‑bones for now, but
            exciting features are on the way.
          </Text>
          <TouchableOpacity style={styles.webButton} onPress={() => Linking.openURL('https://www.voxxyai.com')}>
            <Text style={styles.webButtonText}>Open Web App</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.header}>Your Voxxy Boards ✨</Text>
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
              onPress={() => {
                setFilter(f)
                setShowAll(false) // reset when filter changes
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activities */}
        {data.length === 0 ? (
          <Text style={styles.emptyText}>No activities to show.</Text>
        ) : (
          <>
            {previewData.map(renderActivity)}

            {data.length > PREVIEW_COUNT && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAll(!showAll)}
              >
                <Text style={styles.showMoreText}>
                  {showAll ? 'Show Less' : `Show ${data.length - PREVIEW_COUNT} More`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <YourCommunity
          showInvitePopup={showInvitePopup}
          onSelectUser={peer => console.log('Selected:', peer)}
          onInvitePress={() => setShowInvitePopup(true)}
        />
      </ScrollView>
      <VoxxyFooter />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  scrollContainer: { paddingBottom: 40 },

  header: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12, paddingHorizontal: 20, paddingVertical: 0, borderRadius: 20,},
  webButton: {
    marginTop: 20,
    backgroundColor: '#cc31e8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#cc31e8',
  },
  webButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  titleSection: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  highlight: { color: '#b931d6' },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    maxWidth: 300,
  },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: { backgroundColor: '#b931d6' },
  filterText: { color: '#ccc', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#201925',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginVertical: 8,
    // shadow for iOS
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // elevation for Android
    elevation: 3,
  },
  cardName: { fontSize: 18, color: '#fff', fontWeight: '600' },
  cardMeta: { fontSize: 14, color: '#ccc', marginTop: 4 },
  cardLink: {
    fontSize: 14,
    color: '#CC31E8',
    marginTop: 8,
    fontWeight: '500',
  },

  showMoreButton: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  showMoreText: {
    color: '#b931d6',
    fontWeight: '600',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginVertical: 40,
  },
})