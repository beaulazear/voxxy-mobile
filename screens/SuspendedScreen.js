import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  SafeAreaView,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import * as Feather from 'react-native-feather';

const SuspendedScreen = () => {
  const { moderationStatus, suspendedUntil, logout, refreshUser } = useContext(UserContext);

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@voxxyai.com?subject=Account%20Appeal');
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleRefresh = async () => {
    await refreshUser();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isBanned = moderationStatus === 'banned';
  const isSuspended = moderationStatus === 'suspended';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          {isBanned ? (
            <Feather.XCircle size={80} color="#FF6B6B" />
          ) : (
            <Feather.AlertCircle size={80} color="#FFA500" />
          )}
        </View>

        <Text style={styles.title}>
          {isBanned ? 'Account Banned' : 'Account Suspended'}
        </Text>

        <Text style={styles.description}>
          {isBanned
            ? 'Your account has been permanently banned due to severe violations of our community guidelines.'
            : `Your account has been temporarily suspended and will be reinstated on:`}
        </Text>

        {isSuspended && suspendedUntil && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Suspension ends:</Text>
            <Text style={styles.dateText}>{formatDate(suspendedUntil)}</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Why was my account {isBanned ? 'banned' : 'suspended'}?</Text>
          <Text style={styles.infoText}>
            Accounts are {isBanned ? 'banned' : 'suspended'} for violations of our community guidelines, which may include:
          </Text>
          <View style={styles.reasonsList}>
            <Text style={styles.reasonItem}>• Harassment or bullying</Text>
            <Text style={styles.reasonItem}>• Hate speech or discrimination</Text>
            <Text style={styles.reasonItem}>• Spam or misleading content</Text>
            <Text style={styles.reasonItem}>• Inappropriate or offensive content</Text>
            <Text style={styles.reasonItem}>• Violence or dangerous behavior</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>What can I do?</Text>
          <Text style={styles.infoText}>
            {isBanned
              ? 'If you believe this ban was made in error, you can appeal by contacting our support team. Please provide your account email and a detailed explanation.'
              : 'Your account will be automatically reinstated when the suspension period ends. If you believe this suspension was made in error, you can contact our support team.'}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {isSuspended && (
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Feather.RefreshCw size={20} color="#fff" />
              <Text style={styles.refreshButtonText}>Check Status</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
            <Feather.Mail size={20} color="#fff" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather.LogOut size={20} color="#cc31e8" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            We take our community guidelines seriously to ensure Voxxy remains a safe and enjoyable platform for everyone.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://voxxyai.com/terms')}
          >
            <Text style={styles.linkText}>View Community Guidelines</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#201925',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  dateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
    width: '100%',
  },
  dateLabel: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFA500',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    marginBottom: 12,
  },
  reasonsList: {
    marginTop: 8,
  },
  reasonItem: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 24,
    marginLeft: 8,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cc31e8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cc31e8',
    gap: 8,
  },
  logoutButtonText: {
    color: '#cc31e8',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(64, 51, 71, 0.3)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#cc31e8',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default SuspendedScreen;