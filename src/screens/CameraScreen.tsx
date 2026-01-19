import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
  Vibration,
  Dimensions,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {launchImageLibrary} from 'react-native-image-picker';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types';
import {scanCalendar} from '../services/apiService';

type CameraScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
};

type FlashMode = 'off' | 'on' | 'auto';

interface ProcessingStage {
  title: string;
  subtitle: string;
}

const PROCESSING_STAGES: ProcessingStage[] = [
  {title: 'Uploading image...', subtitle: 'Preparing your photo'},
  {title: 'Analyzing calendar...', subtitle: 'This may take 20-30 seconds'},
  {title: 'Extracting events...', subtitle: 'Almost done!'},
];

const CameraScreen: React.FC<CameraScreenProps> = ({navigation}) => {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const capturePhoto = async () => {
    if (camera.current) {
      try {
        Vibration.vibrate(50);
        const photo = await camera.current.takePhoto({
          flash: flashMode,
        });
        setCapturedPhoto(`file://${photo.path}`);
      } catch (error) {
        console.error('Error capturing photo:', error);
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      }
    }
  };

  const selectFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      });

      if (result.assets && result.assets[0]?.uri) {
        setCapturedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo from gallery.');
    }
  };

  const processPhoto = async () => {
    if (!capturedPhoto) return;

    setIsProcessing(true);
    setProcessingStage(0);

    // Progress through stages
    const stageTimer = setInterval(() => {
      setProcessingStage(prev => {
        if (prev < PROCESSING_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 8000);

    try {
      const response = await scanCalendar(capturedPhoto, customInstructions);
      clearInterval(stageTimer);

      if (response.events && response.events.length > 0) {
        navigation.replace('EventReview', {events: response.events});
      } else {
        Alert.alert(
          'No Events Found',
          'Could not find any events in this image. Try taking a clearer photo or adding custom instructions.',
          [
            {text: 'Try Again', onPress: () => setCapturedPhoto(null)},
            {text: 'Go Back', onPress: () => navigation.goBack()},
          ],
        );
      }
    } catch (error: any) {
      clearInterval(stageTimer);
      console.error('Error processing photo:', error);

      let errorMessage = 'Failed to process the image. Please try again.';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again with a clearer image.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      }

      Alert.alert('Processing Error', errorMessage, [
        {text: 'Try Again', onPress: () => setCapturedPhoto(null)},
        {text: 'Go Back', onPress: () => navigation.goBack()},
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingStage(0);
    }
  };

  const toggleFlash = () => {
    Vibration.vibrate(30);
    setFlashMode(prev => {
      if (prev === 'off') return 'auto';
      if (prev === 'auto') return 'on';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on':
        return '⚡';
      case 'auto':
        return '⚡A';
      default:
        return '⚡✗';
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan calendars.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>No camera device found.</Text>
      </View>
    );
  }

  // Photo Preview Screen
  if (capturedPhoto) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{uri: capturedPhoto}} style={styles.previewImage} />

        {isProcessing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.processingTitle}>
              {PROCESSING_STAGES[processingStage].title}
            </Text>
            <Text style={styles.processingSubtitle}>
              {PROCESSING_STAGES[processingStage].subtitle}
            </Text>
          </View>
        ) : (
          <>
            {/* Custom Instructions Panel */}
            <View style={styles.instructionsPanel}>
              <Text style={styles.instructionsLabel}>
                Custom Instructions (Optional)
              </Text>
              <TextInput
                style={styles.instructionsInput}
                placeholder="e.g., 'Only extract events for Saturday' or 'Focus on morning shifts'"
                placeholderTextColor="#999"
                value={customInstructions}
                onChangeText={setCustomInstructions}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.previewButtons}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => setCapturedPhoto(null)}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.processButton}
                onPress={processPhoto}>
                <Text style={styles.processButtonText}>Process Photo</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  // Camera Screen
  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
          <Text style={styles.flashButtonText}>{getFlashIcon()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowInstructions(!showInstructions)}>
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions Panel (Collapsible) */}
      {showInstructions && (
        <View style={styles.floatingInstructions}>
          <Text style={styles.floatingLabel}>Custom Instructions</Text>
          <TextInput
            style={styles.floatingInput}
            placeholder="e.g., 'Only Saturday events'"
            placeholderTextColor="#999"
            value={customInstructions}
            onChangeText={setCustomInstructions}
          />
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.galleryButton} onPress={selectFromGallery}>
          <Text style={styles.galleryButtonText}>🖼️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={styles.placeholder} />
      </View>

      {/* Guidance Text */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceText}>
          Position the calendar within the frame
        </Text>
      </View>
    </View>
  );
};

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 20,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  floatingInstructions: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 16,
    zIndex: 10,
  },
  floatingLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  floatingInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButtonText: {
    fontSize: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    width: 50,
    height: 50,
  },
  guidanceContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  guidanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  processingSubtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 8,
  },
  instructionsPanel: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 16,
  },
  instructionsLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  previewButtons: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  retakeButton: {
    flex: 1,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  processButton: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#4A90D9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  processButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CameraScreen;
