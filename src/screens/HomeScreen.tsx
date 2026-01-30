import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface UseCase {
  icon: string;
  title: string;
  description: string;
}

const USE_CASES: UseCase[] = [
  {
    icon: '💼',
    title: 'Work Schedules',
    description: 'Shift rosters, duty schedules, on-call rotations',
  },
  {
    icon: '📚',
    title: 'School Calendars',
    description: 'Class schedules, exam dates, assignment deadlines',
  },
  {
    icon: '🎵',
    title: 'Concert Lineups',
    description: 'Festival schedules, show times, stage assignments',
  },
  {
    icon: '💊',
    title: 'Medication Schedules',
    description: 'Prescription reminders, appointment times',
  },
  {
    icon: '🏋️',
    title: 'Gym Timetables',
    description: 'Class schedules, trainer sessions, facility hours',
  },
  {
    icon: '👶',
    title: 'Kids Activities',
    description: 'Sports practices, recitals, school events',
  },
  {
    icon: '🎤',
    title: 'Conference Agendas',
    description: 'Session times, speaker schedules, breakout rooms',
  },
  {
    icon: '📅',
    title: 'Any Calendar',
    description: 'AI extracts events from any visual schedule',
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkMode');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('darkMode', newMode.toString());
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>Calendar Snap</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Text style={styles.themeIcon}>{isDarkMode ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroCard, {backgroundColor: theme.card}]}>
          <Text style={styles.heroIcon}>📸</Text>
          <Text style={[styles.heroTitle, {color: theme.text}]}>
            Snap Any Schedule or Event
          </Text>
          <Text style={[styles.heroSubtitle, {color: theme.subtext}]}>
            Take a photo of anything with dates and AI will extract the events
            automatically
          </Text>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.8}>
          <Text style={styles.scanButtonIcon}>📷</Text>
          <Text style={styles.scanButtonText}>Snap a Photo</Text>
        </TouchableOpacity>

        {/* Use Case Ideas */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          Use Case Ideas
        </Text>
        <View style={styles.useCaseGrid}>
          {USE_CASES.map((useCase, index) => (
            <View
              key={index}
              style={[styles.useCaseCard, {backgroundColor: theme.card}]}>
              <Text style={styles.useCaseIcon}>{useCase.icon}</Text>
              <Text style={[styles.useCaseTitle, {color: theme.text}]}>
                {useCase.title}
              </Text>
              <Text style={[styles.useCaseDesc, {color: theme.subtext}]}>
                {useCase.description}
              </Text>
            </View>
          ))}
        </View>

        {/* How It Works */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          How It Works
        </Text>
        <View style={[styles.stepsCard, {backgroundColor: theme.card}]}>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={[styles.stepText, {color: theme.text}]}>
              Take a photo of any calendar or schedule
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={[styles.stepText, {color: theme.text}]}>
              AI extracts all events automatically
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={[styles.stepText, {color: theme.text}]}>
              Review, edit, and add to your calendar
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const lightTheme = {
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#1A1A1A',
  subtext: '#666666',
};

const darkTheme = {
  background: '#1A1A1A',
  card: '#2D2D2D',
  text: '#FFFFFF',
  subtext: '#AAAAAA',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  themeToggle: {
    padding: 8,
  },
  themeIcon: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  scanButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#4A90D9',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  useCaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  useCaseCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  useCaseIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  useCaseTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  useCaseDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  stepsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90D9',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
});

export default HomeScreen;
