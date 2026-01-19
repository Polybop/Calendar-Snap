import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Share,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList, CalendarEvent, DeviceCalendar} from '../types';
import {generateICS} from '../services/apiService';

type EventReviewScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventReview'>;
  route: RouteProp<RootStackParamList, 'EventReview'>;
};

const EventReviewScreen: React.FC<EventReviewScreenProps> = ({
  navigation,
  route,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>(
    route.params.events.map((e, i) => ({
      ...e,
      id: e.id || `event-${i}-${Date.now()}`,
      approved: true,
    })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CalendarEvent | null>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<DeviceCalendar | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadCalendars();
    loadSelectedCalendar();
  }, []);

  const loadCalendars = async () => {
    // TODO: Implement native calendar module to fetch device calendars
    // For now, we'll use mock data until native module is set up
    setCalendars([
      {id: '1', name: 'Personal', accountName: 'Local', accountType: 'local'},
    ]);
  };

  const loadSelectedCalendar = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedCalendar');
      if (saved) {
        setSelectedCalendar(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading selected calendar:', error);
    }
  };

  const saveSelectedCalendar = async (calendar: DeviceCalendar) => {
    try {
      await AsyncStorage.setItem('selectedCalendar', JSON.stringify(calendar));
      setSelectedCalendar(calendar);
    } catch (error) {
      console.log('Error saving selected calendar:', error);
    }
  };

  const toggleEventSelection = (id: string) => {
    setEvents(prev =>
      prev.map(e => (e.id === id ? {...e, approved: !e.approved} : e)),
    );
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const startEditing = (event: CalendarEvent) => {
    setEditingId(event.id || null);
    setEditForm({...event});
  };

  const saveEdit = () => {
    if (editForm && editingId) {
      setEvents(prev =>
        prev.map(e => (e.id === editingId ? {...editForm, id: editingId} : e)),
      );
    }
    setEditingId(null);
    setEditForm(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const addNewEvent = () => {
    const newEvent: CalendarEvent = {
      id: `new-${Date.now()}`,
      title: 'New Event',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      description: '',
      approved: true,
    };
    setEvents(prev => [...prev, newEvent]);
    startEditing(newEvent);
  };

  const selectAllEvents = () => {
    setEvents(prev => prev.map(e => ({...e, approved: true})));
  };

  const deselectAllEvents = () => {
    setEvents(prev => prev.map(e => ({...e, approved: false})));
  };

  const exportICS = async () => {
    const selectedEvents = events.filter(e => e.approved);
    if (selectedEvents.length === 0) {
      Alert.alert('No Events Selected', 'Please select at least one event to export.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await generateICS(selectedEvents);
      const icsContent = await response.text();

      // Save to cache directory
      const filePath = `${RNFS.CachesDirectoryPath}/calendar-events.ics`;
      await RNFS.writeFile(filePath, icsContent, 'utf8');

      // Share the file
      await Share.share({
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        title: 'Calendar Events',
      });

      // Clean up
      setTimeout(() => {
        RNFS.unlink(filePath).catch(() => {});
      }, 60000);
    } catch (error) {
      console.error('Error exporting ICS:', error);
      Alert.alert('Export Error', 'Failed to export calendar file.');
    } finally {
      setIsExporting(false);
    }
  };

  const addToCalendar = async () => {
    const selectedEvents = events.filter(e => e.approved);
    if (selectedEvents.length === 0) {
      Alert.alert('No Events Selected', 'Please select at least one event to add.');
      return;
    }

    // TODO: Implement native calendar integration
    // For now, show a message
    Alert.alert(
      'Coming Soon',
      `${selectedEvents.length} event(s) would be added to your calendar. Native calendar integration coming soon!`,
    );
  };

  const renderEventCard = (event: CalendarEvent) => {
    if (editingId === event.id && editForm) {
      // Edit Mode
      return (
        <View key={event.id} style={styles.eventCard}>
          <TextInput
            style={styles.editInput}
            value={editForm.title}
            onChangeText={text => setEditForm({...editForm, title: text})}
            placeholder="Event Title"
          />
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, styles.halfInput]}
              value={editForm.startDate}
              onChangeText={text => setEditForm({...editForm, startDate: text})}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, styles.halfInput]}
              value={editForm.startTime || ''}
              onChangeText={text => setEditForm({...editForm, startTime: text})}
              placeholder="Start HH:MM"
            />
            <TextInput
              style={[styles.editInput, styles.halfInput]}
              value={editForm.endTime || ''}
              onChangeText={text => setEditForm({...editForm, endTime: text})}
              placeholder="End HH:MM"
            />
          </View>
          <TextInput
            style={styles.editInput}
            value={editForm.location || ''}
            onChangeText={text => setEditForm({...editForm, location: text})}
            placeholder="Location"
          />
          <TextInput
            style={[styles.editInput, styles.multilineInput]}
            value={editForm.description || ''}
            onChangeText={text => setEditForm({...editForm, description: text})}
            placeholder="Description"
            multiline
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // View Mode
    return (
      <View key={event.id} style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleEventSelection(event.id!)}>
            <Text style={styles.checkboxText}>
              {event.approved ? '☑️' : '⬜'}
            </Text>
          </TouchableOpacity>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDate}>
              {event.startDate}
              {event.startTime && ` • ${event.startTime}`}
              {event.endTime && ` - ${event.endTime}`}
            </Text>
            {event.location && (
              <Text style={styles.eventLocation}>📍 {event.location}</Text>
            )}
            {event.description && (
              <Text style={styles.eventDescription} numberOfLines={2}>
                {event.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.eventActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => startEditing(event)}>
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteEvent(event.id!)}>
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const selectedCount = events.filter(e => e.approved).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <Text style={styles.headerButton}>← Start Over</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {events.length} Event{events.length !== 1 ? 's' : ''} Found
        </Text>
        <TouchableOpacity onPress={addNewEvent}>
          <Text style={styles.headerButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Event List */}
      <ScrollView style={styles.eventList} showsVerticalScrollIndicator={false}>
        {events.map(renderEventCard)}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bulk Actions */}
      <View style={styles.bulkActions}>
        <TouchableOpacity style={styles.bulkButton} onPress={selectAllEvents}>
          <Text style={styles.bulkButtonText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkButton} onPress={deselectAllEvents}>
          <Text style={styles.bulkButtonText}>Deselect All</Text>
        </TouchableOpacity>
      </View>

      {/* Export Actions */}
      <View style={styles.exportActions}>
        <TouchableOpacity
          style={[styles.exportButton, styles.icsButton]}
          onPress={exportICS}
          disabled={isExporting || selectedCount === 0}>
          <Text style={styles.exportButtonText}>
            {isExporting ? 'Exporting...' : 'Export .ics'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportButton, styles.calendarButton]}
          onPress={addToCalendar}
          disabled={selectedCount === 0}>
          <Text style={styles.exportButtonText}>
            Add to Calendar ({selectedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Picker Modal */}
      <Modal
        visible={showCalendarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendarPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Calendar</Text>
            <FlatList
              data={calendars}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.calendarItem}
                  onPress={() => {
                    saveSelectedCalendar(item);
                    setShowCalendarPicker(false);
                  }}>
                  <Text style={styles.calendarName}>{item.name}</Text>
                  <Text style={styles.calendarAccount}>{item.accountName}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCalendarPicker(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButton: {
    color: '#4A90D9',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  eventList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkboxText: {
    fontSize: 22,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#4A90D9',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 18,
  },
  editInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    color: '#1A1A1A',
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bulkButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  bulkButtonText: {
    color: '#4A90D9',
    fontSize: 14,
    fontWeight: '600',
  },
  exportActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  exportButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  icsButton: {
    backgroundColor: '#6B7280',
    marginRight: 8,
  },
  calendarButton: {
    backgroundColor: '#4A90D9',
    marginLeft: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  calendarItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  calendarAccount: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#4A90D9',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventReviewScreen;
