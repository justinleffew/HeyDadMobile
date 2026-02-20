import { useEffect, useRef, useState } from 'react';
import { Camera, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import {
  Animated,
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker';
import { Video, Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from 'hooks/useAuth';
import { generateThumbnails } from 'utils/thumbnailGenerator';
import { ThumbnailSelector } from 'components/ThumbnailSelector';
import { supabase } from 'utils/supabase';
import { useVideoUploadSession } from 'hooks/useVideoUploadSession';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RetryUploadModal from 'components/RetryUploadModal';
import { useRouter } from 'expo-router';
import ImageNarration from 'components/ImageNarration';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../providers/ThemeProvider';

const videoExtension = Platform.OS === 'ios' ? '.mov' : '.mp4'
import UploadWaitScreen from "../../../components/UploadWaitScreen";

const MAX_SEC = 120;

const RecordLegacyScreen = () => {
  const cameraRef = useRef(null)
  const params = useLocalSearchParams()
  const { defaultTab } = params
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [timedProgress, setTimedProgress] = useState(0)
  const timedProgressRef = useRef<NodeJS.Timeout | null>(null)
  const [isRecording, setIsRecording] = useState(false);
  const [childImageUrls, setChildImageUrls] = useState({});
  const [formLoading, setFormLoading] = useState(false)
  const [durationSec, setDurationSec] = useState<number>(0);
  const [showPromptOverlay, setShowPromptOverlay] = useState(true)
  const [showPreview, setShowPreview] = useState(false);
  const [videoUri, setVideoUri] = useState("")
  const [videoResult, setVideoResult] = useState(null)
  const [title, setTitle] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [children, setChildren] = useState([])
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState("");
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [unlockType, setUnlockType] = useState("now");
  const [unlockAge, setUnlockAge] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [unlockMilestone, setUnlockMilestone] = useState("");
  const [error, setError] = useState("");
  const [processingStatus, setProcessingStatus] = useState("pending");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState("");
  const { user, signOut, setVideoCount, setHasChild } = useAuth()
  const [audioPermissionGranted, setAudioPermissionGranted] = useState<boolean | null>(null);
  const [audioCanAskAgain, setAudioCanAskAgain] = useState(true);
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [permissionModalDismissed, setPermissionModalDismissed] = useState(false);
  const [tab, setTab] = useState(defaultTab || "video")
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter()

  const [savingNarration, setSavingNarration] = useState(false)
  const [videoTitleFocused, setVideoTitleFocused] = useState(false);

  // Child scale animations for video tab
  const childScaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const getChildScale = (id: string) => {
    if (!childScaleAnims[id]) {
      childScaleAnims[id] = new Animated.Value(1);
    }
    return childScaleAnims[id];
  };

  const { height } = Dimensions.get('window')
  const [videoSessionId, setVideoSessionId] = useState("");
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const badgeText = isDark ? "text-gray-100" : "text-slate-600 "
  const datePlaceholderClass = isDark ? 'text-gray-500' : 'text-gray-400';
  const uploadTextClass = isDark ? 'text-gray-300' : 'text-gray-400';
  const addButtonTextClass = 'flex-1 text-center text-white font-medium';
  const formCardClass = isDark ? 'bg-[#1f2937]' : 'bg-white';
  const labelTextClass = isDark ? 'text-gray-200' : 'text-gray-900';
  const screenBackground = isDark ? 'bg-gray-900' : 'bg-[#F5F3EF]';
  const headerBackground = isDark ? '#1f2937' : '#1B2838';
  const contentSurface = isDark ? 'bg-gray-900' : 'bg-[#F5F3EF]';
  const sectionCard = isDark ? 'bg-[#1f2937] border border-gray-700' : 'bg-white border border-[#e8e5e0]';
  const previewBorderClass = isDark ? 'border-gray-600' : 'border-gray-400';
  const secondaryCard = isDark ? 'bg-[#1f2937] border border-gray-700' : 'bg-white border border-[#e8e5e0]';
  const headingText = isDark ? 'text-gray-100' : 'text-[#1B2838]';
  const bodyText = isDark ? 'text-gray-400' : 'text-gray-500';
  const subheadingText = isDark ? 'text-gray-200' : 'text-[#1B2838]';
  const tabContainerActive = isDark ? 'bg-gray-700' : 'bg-[#1B2838]';
  const tabContainerInactive = isDark ? 'border border-gray-600' : 'border border-[#d1cdc6]';
  const tabTextActive = 'text-white';
  const tabTextInactive = isDark ? 'text-gray-300' : 'text-[#1B2838]';
  const ideaButtonClass = isDark ? 'bg-slate-700' : 'bg-[#1B2838]';
  const ideaPromptClass = isDark ? 'bg-[#1f2937] border border-gray-700 shadow-xs' : 'bg-white border border-[#e8e5e0]';
  const ctaButton = isDark ? 'bg-gray-700' : 'bg-[#D4A853]';
  const cancelButtonClass = isDark ? 'flex-1 border border-gray-600 rounded-md px-4 py-2' : 'flex-1 border border-[#d1cdc6] rounded-md px-4 py-2';
  const dashedBorder = isDark ? 'border-gray-600' : 'border-[#d1cdc6]';
  const solidBorder = isDark ? 'border-gray-600' : 'border-[#d1cdc6]';
  const dashedText = isDark ? 'text-gray-300' : 'text-gray-500';
  const uploadIconColor = isDark ? '#cbd5f5' : '#6B7280';
  const accentColor = isDark ? '#60A5FA' : '#D4A853';
  const infoHeading = isDark ? 'text-gray-200' : 'text-[#1B2838]';
  const infoBody = isDark ? 'text-gray-300' : 'text-gray-100';
  const saveButton = isDark ? 'bg-gray-700' : 'bg-[#1B2838]';
  const bottomBarBackground = isDark ? 'bg-gray-900' : 'bg-[#F5F3EF]';
  const backButton = isDark ? 'border border-gray-600' : 'border border-[#d1cdc6]';
  const backButtonText = isDark ? 'text-gray-300' : 'text-gray-600';
  const cancelButtonTextClass = isDark ? 'text-center text-gray-200' : 'text-center text-gray-900';
  const uploadBorderClass = isDark ? 'border-gray-600' : 'border-[#d1cdc6]';
  const uploadAccentTextClass = isDark ? 'text-green-400' : 'text-[#D4A853]';
  const addButtonClass = (disabled: boolean) => {
    if (disabled) {
      return isDark ? 'bg-gray-600 flex-row items-center px-4 py-2 rounded-md' : 'bg-gray-300 flex-row items-center px-4 py-2 rounded-md';
    }
    return isDark
      ? 'flex-1 bg-slate-700 flex-row items-center px-4 py-2 rounded-md'
      : 'flex-1 bg-[#2C3E50] flex-row items-center px-4 py-2 rounded-md';
  };


  const startProgress = (seconds: number) => {
    if (timedProgressRef.current) clearInterval(timedProgressRef.current);
    timedProgressRef.current = setInterval(() => {
      setTimedProgress((p) => {
        if (p >= 100) {
          if (timedProgressRef.current) clearInterval(timedProgressRef.current);
          return 100;
        }
        return p + 1;
      });
    }, seconds);
  };

  const inputClass = isDark
    ? 'border border-gray-600 rounded-lg px-4 py-3 text-base bg-gray-800 text-gray-100'
    : 'border border-gray-300 rounded-lg px-4 py-3 text-base bg-white text-gray-900';
  const textareaClass = `${inputClass} h-24`;
  const modalCard = isDark ? 'bg-[#111827] border border-gray-700' : 'bg-white border border-gray-200';
  const checkboxSelected = 'bg-blue-500 border-blue-500';
  const checkboxUnselected = isDark ? 'border-gray-600' : 'border-gray-400';
  const radioSelected = 'border-blue-500';
  const radioUnselected = isDark ? 'border-gray-600' : 'border-gray-400';
  const closeIconColor = isDark ? '#cbd5f5' : '#9CA3AF';
  const [editingChild, setEditingChild] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateValueClass = isDark ? 'text-gray-100' : 'text-gray-900';

  const handleImageUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFormData({
        ...formData,
        imageFile: result.assets[0].uri
      })
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    birthdate: new Date(),
    imageFile: "",
    imagePreview: "",
  });


  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: "",
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      birthdate: new Date(),
      imageFile: null,
      imagePreview: "",
    });
    setShowAddForm(false);
    setEditingChild(null);
    setError("");
    setSuccessMessage("");
  };

  useEffect(() => {
    const initPermissionsAndData = async () => {
      try {
        await requestPermission();
      } catch (error) {
        console.warn('Error requesting camera permission:', error);
      }

      try {
        const audioStatus = await Audio.getPermissionsAsync();
        setAudioPermissionGranted(audioStatus.granted);
        setAudioCanAskAgain(audioStatus.canAskAgain);

        if (!audioStatus.granted && audioStatus.canAskAgain) {
          const requestedStatus = await Audio.requestPermissionsAsync();
          setAudioPermissionGranted(requestedStatus.granted);
          setAudioCanAskAgain(requestedStatus.canAskAgain);
        }
      } catch (error) {
        console.warn('Error requesting audio permission:', error);
        setAudioPermissionGranted(false);
        setAudioCanAskAgain(false);
      }

      await fetchChildren();
    };
    initPermissionsAndData();
  }, [])


  useEffect(() => {
    setTab(defaultTab || 'video')
  }, [defaultTab])

  useEffect(() => {
    const initializeSessionId = async () => {
      try {
        // Check for an existing active upload ID first (from a previous failed upload)
        const existingId = await AsyncStorage.getItem("active-upload-id");
        if (existingId) {
          // Verify there's actually saved data for this upload
          const savedMetadata = await AsyncStorage.getItem(`video-${existingId}`);
          if (savedMetadata) {
            console.log("Restoring previous upload session:", existingId);
            setVideoSessionId(existingId);
            return;
          }
        }

        // No pending upload — create a fresh session ID
        const newId = `${user.id}/${Date.now()}${videoExtension}`;
        await AsyncStorage.setItem("active-upload-id", newId);
        setVideoSessionId(newId);
      } catch (error) {
        console.error('Error initializing session ID:', error);
        setVideoSessionId(`${user.id}/${Date.now()}${videoExtension}`);
      }
    };

    initializeSessionId();
  }, [user?.id]);

  useEffect(() => {
    if (!permission || audioPermissionGranted === null) {
      return;
    }

    if (!permission.granted || !audioPermissionGranted) {
      if (!permissionModalDismissed) {
        setIsPermissionModalVisible(true);
      }
      return;
    }

    setIsPermissionModalVisible(false);
    if (permissionModalDismissed) {
      setPermissionModalDismissed(false);
    }
  }, [permission, audioPermissionGranted, permissionModalDismissed]);

  const {
    upload,
    progress,
    status,
    retry,
    showRetryModal,
    flush,
    error: uploadError,
  } = useVideoUploadSession(videoSessionId);

  // Wrap flush to also generate a fresh session ID for the next recording
  const handleFlush = async () => {
    await flush();
    const newId = `${user.id}/${Date.now()}${videoExtension}`;
    await AsyncStorage.setItem("active-upload-id", newId);
    setVideoSessionId(newId);
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Unable to open settings:', error);
    }
  };

  const handleDismissPermissionModal = () => {
    setPermissionModalDismissed(true);
    setIsPermissionModalVisible(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });


    if (!result.canceled) {
      setVideoResult(result.assets[0])
      setVideoUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setDurationSec(0)
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDurationSec((p) => {
        if (p >= MAX_SEC) {
          stopRecording();
          return MAX_SEC;
        }
        return p + 1;
      });
    }, 1000);
  };


  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSave = async () => {
    setShowThumbnailModal(false);
    if (!title.trim()) {
      setError("Please enter a title for your video");
      return;
    }

    if (selectedChildren.length === 0) {
      setError("Please select at least one child");
      return;
    }

    if (unlockType === "age" && !unlockAge) {
      setError("Please enter an unlock age");
      return;
    }

    if (unlockType === "date" && !unlockDate) {
      setError("Please select an unlock date");
      return;
    }

    if (unlockType === "milestone" && !unlockMilestone.trim()) {
      setError("Please enter a milestone description");
      return;
    }

    setLoading(true);
    setError("");
    setProcessingStatus("processing");
    setProcessingProgress(0);
    setProcessingError("");

    try {
      setProcessingProgress(20);

      // Upload video to Supabase Storage
      if (videoUri) {

        await upload(
          videoUri,
          selectedThumbnail,
          {
            cloudflare_video_id: null,
            user_id: user?.id,
            title: title.trim(),
            file_path: videoSessionId,
            duration: durationSec,
            unlock_type: unlockType,
            unlock_age: unlockType === "age" ? parseInt(unlockAge) : null,
            unlock_date: unlockType === "date" ? unlockDate : null,
            unlock_milestone: unlockType === "milestone" ? unlockMilestone.trim() : null,
            selectedChildren,
          },
          videoResult,
          () => {
            setVideoCount((prevCount) => prevCount + 1);
            router.replace({ pathname: '(tabs)/memories', params: { defaultTab: 'video' } })
          },
        );
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message);
      setProcessingError(error.message);
      setProcessingStatus("failed");

      // Update video status to failed if we have a video ID
      if (error.videoId) {
        await supabase
          .from("videos")
          .update({
            processing_status: "failed",
            processing_error: error.message,
          })
          .eq("id", error.videoId);
      }
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        startTimer();
        const video = await cameraRef?.current?.recordAsync();
        setVideoResult(video)
        if (video?.uri) setVideoUri(video.uri)
      } catch (error) {
        console.error('Error recording video:', error);
      }
    }
  };

  const selectThumbnail = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your video');
      return;
    }
    if (selectedChildren.length === 0) {
      Alert.alert('Error', 'Please select at least one child');
      return;
    }
    if (unlockType === 'age' && !unlockAge) {
      Alert.alert('Error', 'Please enter an unlock age');
      return;
    }
    if (unlockType === 'date' && !unlockDate) {
      Alert.alert('Error', 'Please select an unlock date');
      return;
    }
    if (unlockType === 'milestone' && !unlockMilestone.trim()) {
      Alert.alert('Error', 'Please enter a milestone description');
      return;
    }

    try {
      setLoading(true);
      setIsGeneratingThumbnails(true);

      const thumbnailBlobs = await generateThumbnails(
        videoUri,
        4,
        recordingTime
      );

      setThumbnails(thumbnailBlobs);
      setShowThumbnailModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate thumbnails. Please try again.');
    } finally {
      setLoading(false);
      setIsGeneratingThumbnails(false);
    }
  };

  const handleThumbnailSelect = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
  };

  const stopRecording = () => {
    setIsRecording(false)
    clearTimer();
    if (cameraRef.current) {
      cameraRef?.current?.stopRecording();
    }
  };


  const fetchChildren = async () => {
    if (user) {
      try {
        setChildrenLoading(true);
        const { data, error } = await supabase
          .from("children")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) {
          console.log('ERROR GETTING IMAGES', error)
        }
        if (error) throw error;
        if (data && data.length > 0) {
          const urls = await loadChildImageUrls(data);
          setChildren(data.map((c, i) => {
            c.image = urls[c.id]
            return c
          }) || []);
        }
      } catch (error) {
        setChildrenLoading(false);
        console.error("Error fetching children:", error);
        setError("Failed to load children");
      } finally {
        setChildrenLoading(false);
      }
    }
  };


  const getChildImageUrl = async (imagePath: string) => {
    if (!imagePath) return null;

    try {
      const { data, error } = await supabase.storage
        .from("child-images")
        .createSignedUrl(imagePath, 3600);

      if (error) {
        console.error("Error creating signed URL:", error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error getting image URL:", error);
      return null;
    }
  };

  const loadChildImageUrls = async (childrenData) => {
    const imageUrls = {};

    for (const child of childrenData) {
      if (child.image_path) {
        const url = await getChildImageUrl(child.image_path);
        if (url) {
          imageUrls[child.id] = url;
        }
      }
    }
    setChildImageUrls(imageUrls);
    return imageUrls
  };

  const handleChildToggle = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId],
    );
  };

  useEffect(() => {
    if (children.length === 1) {
      setSelectedChildren([children[0].id])
    }
  }, [children])

  const [message, setMessage] = useState("")

  const getImageMimeType = (uri) => {
    const extension = uri.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
    };
    return mimeTypes[extension] || 'image/jpeg';
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    setError("");
    setMessage("");

    try {
      let imagePath = editingChild?.image_path || null;

      if (formData.imageFile) {
        const fileName = `${user.id}/${Date.now()}`;
        const data = new FormData()
        data.append('image', {
          uri: formData.imageFile,
          name: `${formData.name.trim()}-${Date.now()}`,
          type: getImageMimeType(formData.imageFile)
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("child-images")
          .upload(fileName, data);

        if (uploadError) throw uploadError;
        imagePath = uploadData.path;
      }

      const childData = {
        user_id: user.id,
        name: formData.name.trim(),
        birthdate: formData.birthdate,
        image_path: imagePath,
      };

      if (editingChild) {
        const { error } = await supabase
          .from("children")
          .update(childData)
          .eq("id", editingChild.id);

        if (error) throw error;
        setMessage("Child updated successfully!");
      } else {
        const { error } = await supabase.from("children").insert([childData]);

        if (error) throw error;
        setHasChild(true);
        setMessage("Child added successfully!");
      }

      await fetchChildren();
      resetForm();
    } catch (error) {
      setError(error.message);
      console.log(error)
    } finally {
      setFormLoading(false);
    }
  };


  if (!permission || audioPermissionGranted === null) {
    return (
      <View className={`flex-1 items-center justify-center ${screenBackground}`}>
        <Text className={bodyText}>Permissions loading...</Text>
      </View>
    );
  }

  const UnlockSelector = () => {
    const opts: Array<["now" | "age" | "date" | "milestone", string]> = [
      ["now", "Now"],
      ["age", "At age"],
      ["date", "On date"],
      ["milestone", "Milestone"],
    ];
    return (
      <View className="flex-row flex-wrap gap-2">
        {opts.map(([val, label]) => {
          const sel = unlockType === val;
          return (
            <TouchableOpacity
              key={val}
              onPress={() => setUnlockType(val)}
              className={`px-4 py-2 rounded-full border ${sel ? "bg-[#D4A853] border-[#D4A853]" : `${isDark ? "border-slate-500" : "border-[#d1cdc6]"}`
                }`}
            >
              <Text className={`font-semibold ${sel ? "text-white" : badgeText} text-sm`}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };


  const cameraGranted = permission.granted;
  const audioGranted = Boolean(audioPermissionGranted);
  const permissionsGranted = cameraGranted && audioGranted;

  const childOptions = children.map((c) => ({ id: c.id, name: c.name }));

  const handleRetake = async () => {
    if (videoUri) {
      try {
        await FileSystem.deleteAsync(videoUri, { idempotent: true });
      } catch (e) {
        console.log('Retake video error', e)
      }
    }
    setVideoUri(null);
  }


  const toggleChild = (id: string) => {
    const willSelect = !selectedChildren.includes(id);
    setSelectedChildren((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (willSelect) {
      const scaleVal = getChildScale(id);
      Animated.sequence([
        Animated.spring(scaleVal, { toValue: 1.08, useNativeDriver: true, speed: 20, bounciness: 12 }),
        Animated.spring(scaleVal, { toValue: 1.0, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenBackground}`}>
      <StatusBar barStyle={isDark ? 'light' : 'dark'} backgroundColor={headerBackground} />
      <Modal
        visible={isPermissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissPermissionModal}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className={`w-full max-w-sm rounded-2xl p-6 ${modalCard}`}>
            <View className="items-center justify-center mb-4">
              <Ionicons name="shield-checkmark-outline" size={32} color={accentColor} />
            </View>
            <Text className={`text-center text-xl font-semibold mb-2 ${headingText}`}>
              Enable Camera & Microphone
            </Text>
            <Text className={`text-center text-base mb-6 ${bodyText}`}>
              We need access to your camera and microphone so you can record stories. Grant access now or enable them from your device settings.
            </Text>

            <TouchableOpacity
              onPress={handleOpenSettings}
              className="w-full rounded-lg bg-blue-600 py-3"
            >
              <Text className="text-center text-white font-semibold">Open Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDismissPermissionModal}
              className="w-full rounded-lg py-3 mt-3"
            >
              <Text className={`text-center font-semibold ${bodyText}`}>
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      {step === 1 ?
        <>
          <RetryUploadModal
            show={showRetryModal}
            onRetry={retry}
            onCancel={handleFlush}
            isRetrying={status === "uploading"}
            progress={progress}
            errorMessage={uploadError}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            className={`flex-1`}
            style={{ backgroundColor: isDark ? '#111827' : '#F5F3EF' }}>
            {/* Subtle top gradient */}
            {!isDark && (
              <LinearGradient
                colors={['#EDE8E0', '#F5F3EF']}
                locations={[0, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
              />
            )}
            <KeyboardAvoidingView behavior={tab !== 'audio' ? 'position' : 'padding'}>
              <View className={`flex-1 px-4`}>
                {/* Title Section */}
                <View className="mt-8 mb-6">
                  <Text style={{ fontSize: 28, fontWeight: '700', color: isDark ? '#f3f4f6' : '#1B2838', textAlign: 'center', marginBottom: 8 }}>Record a Story</Text>
                  <Text style={{ fontSize: 14, fontStyle: 'italic', color: isDark ? 'rgba(243,244,246,0.5)' : 'rgba(27,40,56,0.5)', textAlign: 'center' }}>
                    Take a breath. Then just talk to them.
                  </Text>
                </View>

                {/* Mode switcher removed — screen defaults to video mode */}

                {tab === "video" &&
                  <>
                    <View className="mb-2 ">
                      {params.selectedPrompt ?
                        <View className={`w-full p-4 mt-4 rounded-md ${ideaPromptClass}`}>
                          <View className="flex-row justify-between">
                            <Text className={`font-semibold text-lg ${isDark ? "text-gray-100" : "text-slate-800"}`}>Recording Prompt:</Text>
                          </View>
                          <Text className={`${isDark ? "text-gray-400" : "text-slate-400 "} mt-1 font-semibold`}>{params.selectedPrompt}</Text>
                        </View>
                        : null}
                    </View>

                    {showPreview && !videoUri && cameraGranted &&
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            setShowPreview(false)
                            setShowPromptOverlay(true);
                          }}
                          className="items-center justify-center" style={{ position: "absolute", top: 8, right: 10, zIndex: 2 }}>
                          <Ionicons name="close-outline" size={28} color="white" className="mr-2" />
                        </TouchableOpacity>
                        {showPromptOverlay && params.selectedPrompt && <View
                          style={{ left: '50%', top: 32, zIndex: 2, marginHorizontal: 'auto', transform: [{ translateX: "-46%" }] }}
                          className={`absolute w-full p-4 h-28 justify-center mt-4 rounded-md ${ideaPromptClass}`}>
                          <View className="flex-row w-full">
                            <View className="w-full flex-row justify-between items-center">
                              <Text className={`mt-2 font-semibold text-lg ${isDark ? "text-gray-100" : "text-slate-800"}`}>Recording Prompt:</Text>
                            </View>
                          </View>
                          <Text className={`${isDark ? "text-gray-400" : "text-slate-400 "} mt-1 font-semibold`}>{params.selectedPrompt}</Text>
                          <TouchableOpacity
                            className="ml-auto"
                            onPress={() => setShowPromptOverlay(false)}
                            style={
                              { marginBottom: 4, borderWidth: 1, borderRadius: 10, borderColor: isDark ? "#9ca3af" : "black" }}>
                            <Text className={`rounded-lg px-4 py-1 text-xs ${isDark ? "text-gray-400" : "text-slate-400 "} font-semibold`}>Close</Text>
                          </TouchableOpacity>

                        </View>
                        }
                        <CameraView
                          ratio="1:1"
                          mode="video"
                          style={{
                            flex: 1,
                            height,
                            borderRadius: 8,
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            top: 0
                          }}
                          facing="front"
                          ref={cameraRef}
                        />

                        <View
                          style={{ position: "absolute", top: 0, left: 0, right: 0, height: height / 1.25 }}
                          className="flex-row justify-center items-end">
                          {isRecording && <TouchableOpacity
                            onPress={() => {
                              stopRecording()
                            }}
                            className="px-8 mt-4 bg-red-600 rounded-lg py-4 mb-4">
                            <View className="flex-row items-center justify-center">
                              <Ionicons name="videocam-outline" size={20} color="white" className="mr-2" />
                              <Text className="text-white font-medium ml-2">{fmt(durationSec)} / 2:00</Text>
                            </View>
                          </TouchableOpacity>}

                        </View>
                        {showPreview && !isRecording && !videoUri && <View
                          style={{ position: "absolute", top: 0, left: 0, right: 0, height: height / 1.25 }}
                          className="flex-row justify-center items-end">
                          <TouchableOpacity
                            onPress={() => {
                              if (!permissionsGranted) {
                                setPermissionModalDismissed(false);
                                setIsPermissionModalVisible(true);
                                return;
                              }
                              setIsRecording(true)
                              startRecording()
                            }}
                            style={{ borderWidth: 2, borderColor: "white" }}
                            className="ml-4 w-24 h-24 items-center justify-center rounded-full mt-4  mb-4">
                            <View className="flex-row items-center justify-center">
                              <Ionicons name="ellipse" size={64} color="white" />
                            </View>
                          </TouchableOpacity>
                        </View>}
                      </>
                    }
                    <View
                      style={{ marginTop: showPreview && !videoUri ? 'auto' : 8 }}
                      className={`mt-2 rounded-lg p-4 px-6 ${!showPreview ? sectionCard : ""}`}>
                      <View className="mb-6 w-full justify-center items-center">
                        {!showPreview && children.length ?
                          <Text className={`${isDark ? "text-gray-100" : "text-slate-400 "} mt-2 mb-4 font-semibold`}>
                            Choose who this story is for
                          </Text>
                          : null}

                        <View className="flex-wrap flex-row items-center justify-center">
                          {!showPreview && children.length ? children.map((child, i) => {
                            const sel = selectedChildren.includes(child.id);
                            const scaleVal = getChildScale(child.id);
                            return (
                              <Animated.View key={i} style={{ transform: [{ scale: scaleVal }], opacity: sel ? 1 : 0.5 }}>
                                <TouchableOpacity
                                  onPress={() => toggleChild(child.id)}
                                  className={`items-center ${children.length > 1 && i !== 0 ? "ml-3" : ""}`}>
                                  <View style={sel ? { borderWidth: 3, borderColor: '#D4A853', borderRadius: 999, padding: 2 } : { borderWidth: 3, borderColor: 'transparent', borderRadius: 999, padding: 2 }}>
                                    <Image className="bg-gray-800 rounded-full w-24 h-24" source={{ uri: child.image }} />
                                  </View>
                                  <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '600', color: sel ? (isDark ? '#f3f4f6' : '#1B2838') : (isDark ? '#9CA3AF' : '#94a3b8') }}>{child.name}</Text>
                                </TouchableOpacity>
                              </Animated.View>
                            );
                          }) : null}
                        </View>

                        {!showAddForm && !children.length && !childrenLoading ?
                          <>
                            <View className="mt-2 items-center justify-center">
                              <View className={`border-2 border-slate-200 items-center justify-center w-16 h-16 ${isDark ? "bg-slate-700 " : "bg-slate-100 "} rounded-full`}>
                                <Ionicons name="person-add-outline" size={20} color="#94a3b8" />
                              </View>
                              <Text className={`text-center mt-4 ${bodyText}`}>
                                You have not yet added a child to Hey Dad
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => setShowAddForm(true)}
                              className={`my-4 flex-row w-full ${isDark ? "bg-slate-700" : "bg-slate-800"} rounded-md p-4 items-center justify-center`}>
                              <Ionicons name="add" size={20} color="white" />
                              <Text className={`ml-2 ${infoBody} font-medium`}>Add a child to assign this story</Text>
                            </TouchableOpacity>
                          </>
                          : null}
                        {!children.length && childrenLoading ?
                          <ActivityIndicator size="large" color="#334155" />
                          : null}
                      </View>
                      {showAddForm && (
                        <View style={{ zIndex: 10 }} className={`inset-0 mb-8 rounded-lg ${formCardClass}`}>
                          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>
                              <View className="flex-row items-center justify-between mb-6">
                                <Text className={`text-xl font-semibold ${labelTextClass}`}>
                                  {editingChild ? "Edit Child" : "Add New Child"}
                                </Text>
                                <TouchableOpacity onPress={resetForm}>
                                  <Ionicons name="close" size={20} color={closeIconColor} />
                                </TouchableOpacity>
                              </View>

                              <View className="space-y-6">
                                <View className="gap-6">
                                  <View>
                                    <Text className={`text-sm font-medium mb-2 ${labelTextClass}`}>
                                      Child's Name *
                                    </Text>
                                    <TextInput
                                      value={formData.name}
                                      onChangeText={(text) =>
                                        setFormData((prev) => ({ ...prev, name: text }))
                                      }
                                      className={inputClass}
                                      placeholder="Enter child's name"
                                      placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                    />
                                  </View>

                                  <View>
                                    <Text className={`text-sm font-medium mb-2 ${labelTextClass}`}>
                                      Birth Date *
                                    </Text>
                                    <TouchableOpacity
                                      onPress={() => setShowDatePicker(true)}
                                      className={inputClass}
                                    >
                                      <Text className={formData.birthdate ? dateValueClass : datePlaceholderClass}>
                                        {new Date(formData?.birthdate).toLocaleDateString() || "Select birth date"}
                                      </Text>
                                    </TouchableOpacity>

                                    {showDatePicker && (
                                      <DateTimePicker
                                        textColor={isDark ? "white" : "black"}
                                        value={formData.birthdate || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedDate) => {
                                          const currentDate = selectedDate || formData.birthdate;
                                          setShowDatePicker(Platform.OS === 'ios');
                                          setFormData({ ...formData, birthdate: currentDate });
                                        }}
                                      />
                                    )}
                                  </View>
                                </View>

                                <View>
                                  <Text className={`text-sm font-medium my-2 ${labelTextClass}`}>
                                    Photo
                                  </Text>
                                  <View className="space-y-4">
                                    {formData.imageFile ? (
                                      <View className="relative">
                                        <Image
                                          source={{ uri: formData.imageFile }}
                                          className={`w-32 h-32 rounded-lg border ${previewBorderClass}`}
                                          resizeMode="cover"
                                        />
                                        <TouchableOpacity
                                          onPress={removeImage}
                                          className="absolute -top-2 left-28 rounded-full p-1"
                                          style={{ backgroundColor: '#EF4444' }}
                                        >
                                          <Ionicons name="close" size={12} color="#FFFFFF" />
                                        </TouchableOpacity>
                                      </View>
                                    ) : (
                                      <TouchableOpacity
                                        onPress={handleImageUpload}
                                        className={`border-2 border-dashed rounded-lg p-6 items-center ${uploadBorderClass}`}
                                      >
                                        <Ionicons name="cloud-upload-outline" size={32} color={uploadIconColor} style={{ marginBottom: 8 }} />
                                        <Text className={`text-sm mb-2 ${uploadTextClass}`}>
                                          Click to upload a photo
                                        </Text>
                                        <Text className={`text-sm ${uploadAccentTextClass}`}>
                                          Choose file
                                        </Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>

                                <View className="mt-4 flex-row items-center space-x-3 gap-3">
                                  <TouchableOpacity
                                    style={{ alignItems: 'center', justifyContent: "center" }}
                                    onPress={handleSubmit}
                                    disabled={formLoading}
                                    className={addButtonClass(formLoading)}
                                  >
                                    <Text style={{ textAlign: 'center' }} className={addButtonTextClass}>
                                      {formLoading
                                        ? "Saving..."
                                        : editingChild
                                          ? "Update Child"
                                          : "Add Child"}
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={resetForm}
                                    className={cancelButtonClass}
                                  >
                                    <Text className={cancelButtonTextClass}>Cancel</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </ScrollView>
                        </View>
                      )}



                      {!showPreview && children.length ? <>
                        <TextInput
                          style={{
                            width: '100%',
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            fontSize: 16,
                            color: isDark ? '#f3f4f6' : '#1B2838',
                            backgroundColor: isDark ? '#1f2937' : '#FAFAF8',
                            borderWidth: 0,
                            borderBottomWidth: videoTitleFocused ? 2 : 1,
                            borderBottomColor: videoTitleFocused ? '#D4A853' : (isDark ? '#4b5563' : '#d1cdc6'),
                            borderRadius: 0,
                            marginTop: 8,
                          }}
                          placeholder="e.g. First Day of Kindergarten"
                          value={title}
                          onChangeText={setTitle}
                          placeholderTextColor={isDark ? '#6b7280' : '#94a3b8'}
                          onFocus={() => setVideoTitleFocused(true)}
                          onBlur={() => setVideoTitleFocused(false)}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            router.replace({
                              pathname: "/(tabs)/memories/ideas",
                              params: { tab: "video" }
                            })
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 10, marginBottom: 4 }}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#D4A853" />
                          <Text style={{ marginLeft: 4, fontSize: 13, color: '#D4A853', fontWeight: '600' }}>Need ideas?</Text>
                        </TouchableOpacity>

                        <View className="mb-4 gap-3">
                          <Text className={`mt-4 text-sm ${isDark ? "text-gray-100" : "text-slate-600 "} font-semibold mt-2`}>Unlock</Text>
                          <UnlockSelector />
                          {unlockType === "age" && (
                            <View>
                              <Text className="text-sm text-slate-600 mb-1">Age</Text>
                              <TextInput
                                className="w-full rounded-lg border border-slate-700 bg-[#1b2330] px-3 py-3 text-white"
                                value={unlockAge}
                                onChangeText={setUnlockAge}
                                placeholder="e.g. 18"
                                placeholderTextColor="#94a3b8"
                                keyboardType="number-pad"
                              />
                            </View>
                          )}

                          {unlockType === "date" && (
                            <View>
                              <View>
                                <Text className={`mt-6 text-sm font-medium mb-2 ${labelTextClass}`}>
                                  Birth Date *
                                </Text>
                                <DateTimePicker
                                  textColor={isDark ? "white" : "black"}
                                  value={unlockDate || new Date()}
                                  mode="date"
                                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                  onChange={(event, selectedDate) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    setUnlockDate(selectedDate)
                                  }}
                                />
                              </View>

                            </View>
                          )}

                          {unlockType === "milestone" && (
                            <View>
                              <Text className="text-sm text-slate-600 mb-1">Milestone</Text>
                              <TextInput
                                className="w-full rounded-lg border border-slate-700 bg-[#1b2330] px-3 py-3 text-white"
                                value={unlockMilestone}
                                onChangeText={setUnlockMilestone}
                                placeholder="e.g. High school graduation"
                                placeholderTextColor="#94a3b8"
                              />
                            </View>
                          )}
                        </View>

                      </> : null}

                      {videoUri && !isRecording &&
                        <Video
                          source={{ uri: videoUri }}
                          useNativeControls
                          resizeMode="contain"
                          shouldPlay
                          style={{ borderRadius: 8, aspectRatio: 3 / 4, width: '100%', backgroundColor: '#000' }}
                        />
                      }

                      {/* Start Camera Button */}
                      {children.length && !showPreview && !isRecording && !videoUri ? (
                        <TouchableOpacity
                          onPress={async () => {
                            if (!permissionsGranted) {
                              setPermissionModalDismissed(false);
                              setIsPermissionModalVisible(true);
                              return;
                            }

                            if (!title.trim()) {
                              Alert.alert('Error', 'Please enter a title for your video');
                              return;
                            }
                            if (selectedChildren.length === 0) {
                              Alert.alert('Error', 'Please select at least one child');
                              return;
                            }
                            if (unlockType === 'age' && !unlockAge) {
                              Alert.alert('Error', 'Please enter an unlock age');
                              return;
                            }
                            if (unlockType === 'date' && !unlockDate) {
                              Alert.alert('Error', 'Please select an unlock date');
                              return;
                            }
                            if (unlockType === 'milestone' && !unlockMilestone.trim()) {
                              Alert.alert('Error', 'Please enter a milestone description');
                              return;
                            }

                            setShowPreview(true);
                          }}
                          style={{
                            marginTop: 16,
                            borderRadius: 12,
                            paddingVertical: 16,
                            marginBottom: 16,
                            backgroundColor: isDark ? '#374151' : '#D4A853',
                            shadowColor: isDark ? '#000' : '#D4A853',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.3 : 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                          }}
                        >
                          <View className="flex-row items-center justify-center">
                            <Ionicons name="videocam-outline" size={20} color={isDark ? 'white' : '#1B2838'} />
                            <Text style={{ marginLeft: 8, fontWeight: '600', color: isDark ? 'white' : '#1B2838' }}>Start Camera</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}

                      {videoUri && !isRecording &&
                        <TouchableOpacity
                          onPress={selectThumbnail}
                          style={{
                            marginTop: 16,
                            borderRadius: 12,
                            paddingVertical: 16,
                            marginBottom: 16,
                            backgroundColor: isDark ? '#374151' : '#D4A853',
                            shadowColor: isDark ? '#000' : '#D4A853',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                          }}
                        >
                          <View className="flex-row items-center justify-center">
                            <Text style={{ fontWeight: '600', color: isDark ? 'white' : '#1B2838' }}>Save Video</Text>
                          </View>
                        </TouchableOpacity>
                      }

                      {videoUri ?
                        <TouchableOpacity
                          onPress={handleRetake}
                          className={`border-2 rounded-lg py-4 ${solidBorder}`}>
                          <View className="flex-row items-center justify-center">
                            <MaterialCommunityIcons
                              name="restart"
                              size={18}
                              color={isDark ? "white" : "#0f172a"}
                              style={{ marginRight: 6 }}
                            />
                            <Text className={`${dashedText} font-medium ml-2`}>Retake</Text>
                          </View>
                        </TouchableOpacity>
                        : null}

                      {children.length && !videoUri && !showPreview ?
                        <TouchableOpacity
                          onPress={pickImage}
                          style={{ borderStyle: 'dashed' }}
                          className={`border-2 border-dashed rounded-lg py-4 ${dashedBorder}`}>
                          <View className="flex-row items-center justify-center">
                            <Ionicons name="cloud-upload-outline" size={20} color={uploadIconColor} className="mr-2" />
                            <Text className={`${dashedText} font-medium ml-2`}>Upload Video</Text>
                          </View>
                        </TouchableOpacity>

                        : null}
                    </View>
                  </>}

                {tab === "audio" &&
                  <View className="w-full max-w-2xl mt-3">
                    {params.selectedPrompt ?
                      <View className={`w-full p-4 my-4 rounded-md ${ideaPromptClass}`}>
                        <View className="flex-row justify-between">
                          <Text className={`font-semibold text-lg ${isDark ? "text-gray-100" : "text-slate-800"}`}>Recording Prompt:</Text>
                        </View>
                        <Text className={`${isDark ? "text-gray-400" : "text-slate-400 "} mt-1 font-semibold`}>{params.selectedPrompt}</Text>
                      </View>
                      : null}

                    <View className={`rounded-lg p-6 mb-6 ${secondaryCard}`}>
                      <ImageNarration
                        tab={tab}
                        setTimedProgress={setTimedProgress}
                        setSavingNarration={setSavingNarration}
                        startProgress={startProgress}
                        userId={user?.id}
                        children={children}
                        childrenOptions={childOptions}
                        onSaved={(id: string) => {
                          router.replace({ pathname: '(tabs)/memories', params: { defaultTab: 'audio' } })
                        }}
                        onSelectChildren={(ids: string[]) => setSelectedChildren?.(ids)}
                      />
                    </View>
                  </View>
                }

                {tab === "note" &&
                  <View className="mt-3 w-full max-w-2xl">
                    {params.selectedPrompt ?
                      <View className={`w-full p-4 my-4 rounded-md ${ideaPromptClass}`}>
                        <View className="flex-row justify-between">
                          <Text className={`font-semibold text-lg ${isDark ? "text-gray-100" : "text-slate-800"}`}>Recording Prompt:</Text>
                        </View>
                        <Text className={`${isDark ? "text-gray-400" : "text-slate-400 "} mt-1 font-semibold`}>{params.selectedPrompt}</Text>
                      </View>
                      : null}

                    <View className={`rounded-lg p-6 mb-6 ${secondaryCard}`}>
                      <ImageNarration
                        isAudioNote
                        setTimedProgress={setTimedProgress}
                        setSavingNarration={setSavingNarration}
                        startProgress={startProgress}
                        children={children}
                        userId={user?.id}
                        childrenOptions={childOptions}
                        onSaved={(id: string) => {
                          router.replace({ pathname: '(tabs)/memories', params: { defaultTab: 'note' } })
                        }}
                        onSelectChildren={(ids: string[]) => setSelectedChildren?.(ids)}
                      />
                    </View>
                  </View>
                }

                {/* Footnote links to switch modes — hidden when camera is active */}
                {!(tab === 'video' && (showPreview || videoUri)) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6B7280' }}>Or: </Text>
                  {tab === 'video' && (
                    <>
                      <TouchableOpacity onPress={() => setTab('audio')} activeOpacity={0.7}>
                        <Text style={{ fontSize: 13, color: isDark ? '#D4A853' : '#1B2838', fontWeight: '600' }}>Upload a Photo</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6B7280' }}> · </Text>
                      <TouchableOpacity onPress={() => setTab('note')} activeOpacity={0.7}>
                        <Text style={{ fontSize: 13, color: isDark ? '#D4A853' : '#1B2838', fontWeight: '600' }}>Write a Note</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {tab === 'audio' && (
                    <>
                      <TouchableOpacity onPress={() => setTab('video')} activeOpacity={0.7}>
                        <Text style={{ fontSize: 13, color: isDark ? '#D4A853' : '#1B2838', fontWeight: '600' }}>Record a Video</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6B7280' }}> · </Text>
                      <TouchableOpacity onPress={() => setTab('note')} activeOpacity={0.7}>
                        <Text style={{ fontSize: 13, color: isDark ? '#D4A853' : '#1B2838', fontWeight: '600' }}>Write a Note</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {tab === 'note' && (
                    <>
                      <TouchableOpacity onPress={() => setTab('video')} activeOpacity={0.7}>
                        <Text style={{ fontSize: 13, color: isDark ? '#D4A853' : '#1B2838', fontWeight: '600' }}>Record a Video</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6B7280' }}> · </Text>
                      <TouchableOpacity onPress={() => setTab('audio')} activeOpacity={0.7}>
                        <Text style={{ fontSize: 13, color: isDark ? '#D4A853' : '#1B2838', fontWeight: '600' }}>Upload a Photo</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                )}
              </View>

            </KeyboardAvoidingView>
          </ScrollView>
        </>
        :
        <View className={`flex-1 ${contentSurface}`}>
          <RetryUploadModal
            show={showRetryModal}
            onRetry={retry}
            onCancel={handleFlush}
            isRetrying={status === "uploading"}
            progress={progress}
            errorMessage={uploadError}
          />
          <ScrollView className="px-4">
            <TouchableOpacity
              onPress={() => { setStep(1) }}
              className="flex-row items-center mt-4 mb-6">
              <Ionicons name="chevron-back" size={20} color={isDark ? '#94A3B8' : '#6B7280'} className="mr-2" />
              <Text className={`${bodyText} ml-2`}>Back to Recording</Text>
            </TouchableOpacity>
            <View className="mb-6">
              <Text style={{ fontSize: 24, fontWeight: '700', color: isDark ? '#f3f4f6' : '#1B2838', marginBottom: 8 }}>Save Your Story</Text>
              <Text className={`text-base ${bodyText}`}>
                Choose who will receive this video and when they'll unlock it.
              </Text>
            </View>
            <View className={`rounded-lg p-4 mb-4 ${sectionCard}`}>
              <Text className={`text-base font-medium mb-3 ${infoHeading}`}>Story Title</Text>
              <TextInput
                className={inputClass}
                placeholder="Give your dad story a good title"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'}
              />
            </View>

            <View className={`rounded-lg p-4 mb-4 ${sectionCard}`}>
              <Text className={`text-base font-medium mb-3 ${infoHeading}`}>Additional Notes</Text>
              <TextInput
                className={textareaClass}
                placeholder="Add any additional context, thoughts, or notes about this video message..."
                multiline
                textAlignVertical="top"
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'}
              />
            </View>

            <View className={`rounded-lg p-4 mb-4 ${sectionCard}`}>
              <Text className={`text-base font-medium mb-3 ${infoHeading}`}>Who is this for?</Text>
              {children.length > 0 ? (
                children.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    className="mt-1 flex-row items-center"
                    onPress={() => handleChildToggle(c.id)}
                  >
                    <View
                      className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${selectedChildren.includes(c.id) ? checkboxSelected : checkboxUnselected}`}
                    >
                      {selectedChildren.includes(c.id) && (
                        <Ionicons name="checkmark" size={12} color="white" />
                      )}
                    </View>
                    <Text className={`${infoHeading} text-base`}>{c.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View>
                  <TouchableOpacity
                    onPress={() => setShowAddForm(true)}
                    className={`flex-row w-full ${isDark ? "bg-slate-700" : "bg-slate-800"} rounded-md p-4 items-center justify-center`}>
                    <Ionicons name="add" size={20} color="white" className="mr-2" />
                    <Text className={`${infoBody}`}>Add a child to assign this memory</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View className={`rounded-lg p-4 mb-6 ${sectionCard}`}>
              <Text className={`text-base font-medium mb-3 ${infoHeading}`}>When Should This Unlock?</Text>

              <TouchableOpacity
                className="flex-row items-center mb-3"
                onPress={() => setUnlockType('now')}>
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${unlockType === 'now' ? radioSelected : radioUnselected}`}>
                  {unlockType === 'now' && (
                    <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={`${infoHeading} text-base`}>Available now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center mb-3"
                onPress={() => setUnlockType('age')}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${unlockType === 'age' ? radioSelected : radioUnselected}`}>
                  {unlockType === 'age' && (
                    <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={`${infoHeading} text-base`}>At a specific age</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center mb-3"
                onPress={() => setUnlockType('date')}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${unlockType === 'date' ? radioSelected : radioUnselected}`}>
                  {unlockType === 'date' && (
                    <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={`${infoHeading} text-base`}>On a specific date</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setUnlockType('milestone')}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${unlockType === 'milestone' ? radioSelected : radioUnselected}`}>
                  {unlockType === 'milestone' && (
                    <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={`${infoHeading} text-base`}>At a milestone</Text>
              </TouchableOpacity>
            </View>

            <View className={`flex-row px-4 pb-4 ${bottomBarBackground}`}>
              <TouchableOpacity
                onPress={() => setStep(1)}
                className={`${backButton} rounded-md flex-1 mr-2 py-4 items-center`}>
                <Text className={`${backButtonText} font-medium`}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={selectThumbnail}
                className={`flex-1 ml-2 rounded-lg py-4 items-center ${saveButton}`}>
                <Text className="text-white font-medium">Save Story</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      }
      {showThumbnailModal && (
        <ThumbnailSelector
          thumbnails={thumbnails}
          onThumbnailSelect={handleThumbnailSelect}
          onContinue={handleSave}
          selectedThumbnail={selectedThumbnail}
          isLoading={isGeneratingThumbnails}
          isDark={isDark}
        />
      )}
      {savingNarration ? <UploadWaitScreen progress={timedProgress} /> : null}
    </SafeAreaView >
  );
};

export default RecordLegacyScreen;
