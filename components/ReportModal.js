import React, { useState, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Feather from 'react-native-feather';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

const ReportModal = ({ 
  visible, 
  onClose, 
  reportableType, 
  reportableId, 
  reportableTitle,
  reportableContent = null, // For additional content like welcome_message
  activityId = null,
  onReportSubmitted = () => {},
}) => {
  const [reportReason, setReportReason] = useState('');
  const [customReportReason, setCustomReportReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useContext(UserContext);

  const reportReasons = [
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate', label: 'Hate speech or discrimination' },
    { value: 'inappropriate', label: 'Inappropriate or offensive' },
    { value: 'violence', label: 'Violence or dangerous content' },
    { value: 'misinformation', label: 'False or misleading information' },
    { value: 'privacy', label: 'Privacy violation' },
    { value: 'other', label: 'Other' }
  ];

  const getReportTypeLabel = () => {
    switch (reportableType) {
      case 'user':
      case 'User':
        return 'User';
      case 'activity':
      case 'Activity':
        return 'Activity';
      case 'comment':
      case 'Comment':
        return 'Comment';
      default:
        return 'Content';
    }
  };

  const submitReport = async () => {
    if (!reportReason && !customReportReason.trim()) {
      Alert.alert('Error', 'Please select or enter a reason for reporting');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    const reason = reportReason === 'other' ? customReportReason : reportReason;

    // Build description based on reportable type
    let description = '';
    if (reportableType === 'Activity' && (reportableTitle || reportableContent)) {
      description = `Activity Name: ${reportableTitle || 'N/A'}\n`;
      if (reportableContent) {
        description += `Welcome Message: ${reportableContent}`;
      }
      if (reportReason === 'other') {
        description += `\n\nAdditional details: ${customReportReason}`;
      }
    } else {
      description = reportReason === 'other' ? customReportReason : '';
    }

    try {
      const reportData = {
        report: {
          reportable_type: reportableType,
          reportable_id: reportableId,
          reason: reason,
          description: description,
        }
      };

      // Add activity_id if provided
      if (activityId) {
        reportData.report.activity_id = activityId;
      }

      await safeAuthApiCall(
        `${API_URL}/reports`,
        user.token,
        {
          method: 'POST',
          body: JSON.stringify(reportData)
        }
      );

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review this report within 24 hours.',
        [{ 
          text: 'OK', 
          onPress: () => {
            onReportSubmitted();
            handleClose();
          }
        }]
      );
    } catch (error) {
      logger.error('Error submitting report:', error);
      const userMessage = handleApiError(error, 'Failed to submit report. Please try again.');
      Alert.alert('Error', userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReportReason('');
    setCustomReportReason('');
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Report {getReportTypeLabel()}</Text>
            <TouchableOpacity 
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather.X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {reportableTitle && (
            <View style={styles.reportableInfo}>
              <Text style={styles.reportableLabel}>Reporting:</Text>
              <Text style={styles.reportableTitle} numberOfLines={2}>
                {reportableTitle}
              </Text>
            </View>
          )}

          <Text style={styles.subtitle}>
            Why are you reporting this {getReportTypeLabel().toLowerCase()}?
          </Text>

          <ScrollView style={styles.reasonsContainer} showsVerticalScrollIndicator={false}>
            {reportReasons.map(reason => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonItem,
                  reportReason === reason.value && styles.reasonSelected
                ]}
                onPress={() => setReportReason(reason.value)}
              >
                <View style={[
                  styles.radio,
                  reportReason === reason.value && styles.radioSelected
                ]}>
                  {reportReason === reason.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.reasonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}

            {reportReason === 'other' && (
              <TextInput
                style={styles.customInput}
                placeholder="Please describe the issue..."
                placeholderTextColor="#cbd5e1"
                value={customReportReason}
                onChangeText={setCustomReportReason}
                multiline
                maxLength={500}
              />
            )}
          </ScrollView>

          <View style={styles.infoBox}>
            <Feather.Info size={16} color="#cbd5e1" />
            <Text style={styles.infoText}>
              Reports are reviewed within 24 hours. False reports may result in action against your account.
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!reportReason || (reportReason === 'other' && !customReportReason.trim()) || submitting) 
                  && styles.submitDisabled
              ]}
              onPress={submitReport}
              disabled={!reportReason || (reportReason === 'other' && !customReportReason.trim()) || submitting}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#201925',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(64, 51, 71, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  reportableInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  reportableLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  reportableTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    color: '#e2e8f0',
    padding: 20,
    paddingBottom: 10,
  },
  reasonsContainer: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
  },
  reasonSelected: {
    backgroundColor: 'rgba(204, 49, 232, 0.1)',
    borderColor: '#cc31e8',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#cc31e8',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cc31e8',
  },
  reasonText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  customInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 16,
  },
  buttons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(64, 51, 71, 0.3)',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
  },
  cancelText: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#cc31e8',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ReportModal;