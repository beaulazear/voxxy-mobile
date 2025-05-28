// screens/HomeScreen.js
import React, { useContext, useMemo, useState, useEffect } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking
} from 'react-native'
import { UserContext } from '../context/UserContext'
import AccountCreatedScreen from './AccountCreatedScreen'
import VoxxyFooter from '../components/VoxxyFooter'
import { Users, Calendar, Clock } from 'react-native-feather'
import CustomHeader from '../components/CustomHeader'
import YourCommunity from '../components/YourCommunity'

const FILTERS = ['In Progress', 'Finalized', 'Past', 'Invites']
const PREVIEW_PAST = 4
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
  const hrs = Math.floor(timeLeft / 3_600_000)
  const mins = Math.floor((timeLeft % 3_600_000) / 60_000)
  const secs = Math.floor((timeLeft % 60_000) / 1000)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
}

function CountdownText({ targetTs }) {
  const display = useCountdown(targetTs)
  return (
    <View style={styles.countdownWrap}>
      <Text style={styles.countdownText}>{display}</Text>
    </View>
  )
}

export default function HomeScreen() {
  const { user } = useContext(UserContext)
  const [filter, setFilter] = useState('In Progress')
  const [showAllPast, setShowAllPast] = useState(false)

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

  const dataMap = {
    'In Progress': inProgress,
    'Finalized': finalized,
    'Past': past,
    'Invites': invites,
  }
  const data = dataMap[filter] || []
  const displayed =
    filter === 'Past' && !showAllPast
      ? data.slice(0, PREVIEW_PAST)
      : data

  function renderCard({ item }) {
    const firstName = item.user?.name?.split(' ')[0] || ''

    let countdownTs = null
    if (item.activity_type === 'Meeting' && item.finalized && item.date_day && item.date_time) {
      const [Y, M, D] = item.date_day.split('-').map(Number)
      const [h, m, s] = item.date_time.split('T')[1].split(':').map(Number)
      countdownTs = new Date(Y, M - 1, D, h, m, s).getTime()
    }

    return (
      <View style={styles.card}>
        <View style={styles.hostTag}>
          <Users stroke="#fff" width={12} height={12} />
          <Text style={styles.tagText}>{firstName}</Text>
        </View>
        <View style={styles.typeTag}>
          <Text style={styles.tagText}>{item.emoji} {item.activity_type}</Text>
        </View>

        {countdownTs && <CountdownText targetTs={countdownTs} />}

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.activity_name}</Text>
          <View style={styles.metaRow}>
            <Calendar stroke="#fff" width={12} height={12} />
            <Text style={styles.metaText}>{item.date_day || 'TBD'}</Text>
            <Clock stroke="#fff" width={12} height={12} style={{ marginLeft: 8 }} />
            <Text style={styles.metaText}>{item.date_time?.split('T')[1].slice(0, 5) || 'TBD'}</Text>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.partCount}>
              <Text style={styles.partText}>{(item.participants?.length || 0) + 1} ppl</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`https://www.voxxyai.com/login`)}>
              <Text style={styles.viewLink}>View On Web →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const ListHeader = () => (
    <>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroTitle}>Welcome back, {user.name}! 👋</Text>
          <Text style={styles.heroSub}>What are you planning today?</Text>
        </View>
      </View>
      <FlatList
        data={FILTERS}
        horizontal
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: CARD_MARGIN }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, filter === item && styles.tabActive]}
            onPress={() => { setFilter(item); setShowAllPast(false) }}
          >
            <Text style={[styles.tabText, filter === item && styles.tabTextActive]}>
              {item}{item === 'Invites' && invites.length ? ` (${invites.length})` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <TouchableOpacity style={styles.newBtn} onPress={() => {/* create logic */ }}>
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        }
      />
      {data.length === 0 && <Text style={styles.empty}>No activities to show.</Text>}
    </>
  )

  const ListFooter = () => (
    <View>
      {filter === 'Past' && past.length > PREVIEW_PAST && (
        <TouchableOpacity style={styles.showMore} onPress={() => setShowAllPast(v => !v)}>
          <Text style={styles.showMoreText}>
            {showAllPast ? 'Show Less' : `Show ${past.length - PREVIEW_PAST} More`}
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
          data={displayed}
          keyExtractor={i => String(i.id)}
          numColumns={2}
          renderItem={renderCard}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
        <VoxxyFooter />
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#201925',
  },

  /* vertical padding for the entire list */
  grid: {
    paddingVertical: CARD_MARGIN,
  },

  /* each row of two cards */
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: CARD_MARGIN,
    marginBottom: CARD_MARGIN,
  },

  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 30,
    alignItems: 'center',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: '#0f0f14',
    borderRadius: 12,
    overflow: 'hidden',
    padding: CARD_PADDING,
    paddingBottom: 0,
    paddingTop: CARD_PADDING + 18,
  },

  hostTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#7b298d',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 999,
  },
  typeTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#7b298d',
    padding: 4,
    borderRadius: 999,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 4,
  },

  countdownWrap: {
    marginTop: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  cardBody: {
    paddingHorizontal: 0, // inner padding is handled by card padding
    paddingBottom: CARD_PADDING,
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
    marginBottom: 12,
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
    marginLeft: 4,
  },
  viewLink: {
    color: '#cc31e8',
    fontSize: 12,
  },

  empty: {
    color: '#777',
    textAlign: 'center',
    margin: CARD_MARGIN,
  },
  showMore: {
    alignSelf: 'center',
    marginVertical: CARD_MARGIN,
  },
  showMoreText: {
    color: '#b931d6',
    fontWeight: '600',
  },
})