import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Platform, View, Linking, Modal, Image, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from "react-native";
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from "expo-av";
import ImageUpload from "./ImageUpload";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "utils/supabase";
import { useAuth } from "hooks/useAuth";
import { useTheme } from "providers/ThemeProvider";
import { useRouter } from "expo-router";
import UploadWaitScreen from "./UploadWaitScreen";

type Child = { id: string; name: string };

type Props = {
  userId: string;
  isAudioNote: boolean;
  children: any[],
  setSavingNarration: () => void;
  childrenOptions?: Child[];
  tab: string,
  onSaved?: (id: string) => void;
  bucketImages?: string;
  setTimedProgress: (x: number) => void;
  startProgress: () => void;
  bucketAudio?: string;
};

const MAX_SEC = 120;

const ImageNarration: React.FC<Props> = ({
  userId,
  tab,
  isAudioNote,
  startProgress,
  setSavingNarration,
  setTimedProgress,
  onSaved,
  bucketImages = "images",
  bucketAudio = "audio",
}) => {
  const [imageFile, setImageFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [durationSec, setDurationSec] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [children, setChildren] = useState([])

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [unlockType, setUnlockType] = useState<"now" | "age" | "date" | "milestone">("now");
  const [unlockAge, setUnlockAge] = useState("");
  const [unlockDate, setUnlockDate] = useState(new Date());
  const [unlockMilestone, setUnlockMilestone] = useState("");
  const [saving, setSaving] = useState(false);
  const [permissionModalDismissed, setPermissionModalDismissed] = useState(false);
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState<boolean | null>(null);
  const [audioCanAskAgain, setAudioCanAskAgain] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingChild, setEditingChild] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [childImageUrls, setChildImageUrls] = useState({});

  const [message, setMessage] = useState("")
  const [error, setError] = useState("");
  const { user, setHasChild } = useAuth()


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

  // Pre-select first child on mount
  useEffect(() => {
    if (children.length > 0 && selectedChildren.length === 0) {
      setSelectedChildren([children[0].id])
    }
  }, [children])

  // Pulse animation for mic button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;
  const [micPulseRunning, setMicPulseRunning] = useState(false);

  // Child scale animations
  const childScaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const getChildScale = (id: string) => {
    if (!childScaleAnims[id]) {
      childScaleAnims[id] = new Animated.Value(1);
    }
    return childScaleAnims[id];
  };

  // Title input focus state
  const [titleFocused, setTitleFocused] = useState(false);

  // Start/stop mic pulse animation based on recording state
  useEffect(() => {
    if (!isRecording && !audioUri && !micPulseRunning) {
      // Idle state: pulse gold ring
      setMicPulseRunning(true);
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }
    if (isRecording || audioUri) {
      // Stop pulse when recording or when audio exists
      pulseAnim.stopAnimation();
      pulseOpacity.stopAnimation();
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0);
      setMicPulseRunning(false);
    }
  }, [isRecording, audioUri]);

  // Recording ring pulse (red, faster)
  const recordPulse = useRef(new Animated.Value(1)).current;
  const recordPulseOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(recordPulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
            Animated.timing(recordPulseOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(recordPulse, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(recordPulseOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      recordPulse.stopAnimation();
      recordPulseOpacity.stopAnimation();
      recordPulse.setValue(1);
      recordPulseOpacity.setValue(0);
    }
  }, [isRecording]);

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
        console.error("Error fetching children:", error);
        setError("Failed to load children");
      } finally {
        setChildrenLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [tab])

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

  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sound) {
        sound.unloadAsync().catch(() => { });
      }
    };
  }, [sound]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDurationSec((p) => {
        if (p >= MAX_SEC) {
          stopRecording(true);
          return MAX_SEC;
        }
        return p + 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!permissionsGranted) {
      setPermissionModalDismissed(false);
      setIsPermissionModalVisible(true);
      return;
    }

    if (isRecording) return;
    try {
      if (audioUri) {
        try {
          await FileSystem.deleteAsync(audioUri, { idempotent: true });
        } catch { }
      }
      setAudioUri(null);
      setDurationSec(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      startTimer();
    } catch (e: any) {
      Alert.alert("Recording failed", e?.message || "Please check mic permissions.");
    }
  };

  const stopRecording = async (recording?: boolean) => {
    let currentlyRecording = recording || isRecording
    if (!currentlyRecording || !recordingRef.current) return
    try {
      clearTimer();
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri || null);
    } catch (e) {
      // ignore
    } finally {
      recordingRef.current = null;
    }
  };

  const retakeNarration = async () => {
    clearTimer();
    setIsRecording(false);
    setDurationSec(0);
    setIsPlaying(false);

    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
    } catch { }

    if (audioUri) {
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch { }
    }
    setAudioUri(null);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const togglePlay = async () => {
    if (!audioUri) return;
    try {
      if (!sound) {
        const { sound: snd } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
        setSound(snd);
        setIsPlaying(true);
        snd.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } else {
        const status = await sound.getStatusAsync();
        if ("isPlaying" in status && status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (e) {
      console.log(e)
    }
  };

  const router = useRouter();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const infoBody = isDark ? 'text-gray-300' : 'text-gray-100';
  const badgeText = isDark ? "text-gray-100" : "text-slate-600 "
  const dateValueClass = isDark ? 'text-gray-100' : 'text-gray-900';
  const formCardClass = isDark ? 'bg-[#1f2937]' : 'bg-white';
  const labelTextClass = isDark ? 'text-gray-200' : 'text-gray-900';
  const closeIconColor = isDark ? '#cbd5f5' : '#9CA3AF';
  const inputClass = isDark
    ? 'border border-gray-600 rounded-lg px-4 py-3 text-base bg-gray-800 text-gray-100'
    : 'border border-gray-300 rounded-lg px-4 py-3 text-base bg-white text-gray-900';
  const datePlaceholderClass = isDark ? 'text-gray-500' : 'text-gray-400';
  const previewBorderClass = isDark ? 'border-gray-600' : 'border-gray-400';
  const uploadBorderClass = isDark ? 'border-gray-600' : 'border-gray-400';
  const uploadIconColor = isDark ? '#cbd5f5' : '#6B7280';
  const uploadTextClass = isDark ? 'text-gray-300' : 'text-gray-400';
  const uploadAccentTextClass = isDark ? 'text-green-400' : 'text-green-700';
  const addButtonTextClass = 'flex-1 text-center text-white font-medium';
  const cancelButtonClass = isDark ? 'flex-1 border border-gray-600 rounded-md px-4 py-2' : 'flex-1 border border-gray-400 rounded-md px-4 py-2';
  const cancelButtonTextClass = isDark ? 'text-center text-gray-200' : 'text-center text-gray-900';

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



  const addButtonClass = (disabled: boolean) => {
    if (disabled) {
      return isDark ? 'bg-gray-600 flex-row items-center px-4 py-2 rounded-md' : 'bg-gray-300 flex-row items-center px-4 py-2 rounded-md';
    }
    return isDark
      ? 'flex-1 bg-slate-700 flex-row items-center px-4 py-2 rounded-md'
      : 'flex-1 bg-[#2C3E50] flex-row items-center px-4 py-2 rounded-md';
  };



  const handleImageUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setFormData({
        ...formData,
        imageFile: result.assets[0].uri
      })
    }
  };


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

  const uploadUriToBucket = async (bucket: string, path: string, uri: string) => {

    const data = new FormData()
    const fileName = `${user?.id}/${Date.now()}`;
    data.append('image', {
      uri,
      name: fileName,
      type: getImageMimeType(uri)
    });

    const { error } = await supabase.storage.from(bucket).upload(path, data);

    if (error) throw error;
    return path;
  };

  const save = async () => {
    if (!userId) return Alert.alert("Not signed in.");
    if (!audioUri && !isAudioNote) return Alert.alert("Record narration first.");
    if (!title.trim()) return Alert.alert("Add a title.");
    if (selectedChildren.length === 0) return Alert.alert("Select at least one child.");

    try {
      if (tab === 'audio') {
        startProgress(durationSec < 20 ? 60 : 300)
      }
      setSavingNarration(true)
      setSaving(true);
      const unique = Crypto.randomUUID();
      const base = `${userId}/${unique}`;

      let imagePath: string | null = null;
      if (imageFile?.uri) {
        const guessExt =
          imageFile.fileName?.split(".").pop()?.toLowerCase() ||
          imageFile.uri.split(".").pop()?.toLowerCase() ||
          "jpg";
        imagePath = `${base}.${guessExt}`;
        await uploadUriToBucket(bucketImages, imagePath, imageFile.uri);
      }

      let audioPath: string | null = null;
      if (audioUri) {
        const ext = "m4a";
        audioPath = `${base}.${ext}`;
        await uploadUriToBucket(bucketAudio, audioPath, audioUri);
      }

      const { data, error } = await supabase
        .from("narrations")
        .insert({
          user_id: userId,
          selected_children: selectedChildren,
          title: title.trim(),
          notes: notes.trim(),
          duration_seconds: Math.min(MAX_SEC, durationSec || 0),
          image_path: imagePath,
          audio_path: audioPath,
          unlock_type: unlockType,
          unlock_age: unlockType === "age" ? unlockAge || null : null,
          unlock_date: unlockType === "date" ? unlockDate || null : null,
          unlock_milestone: unlockType === "milestone" ? unlockMilestone || null : null,
        })
        .select("id")
        .single();

      if (error) throw error;
      onSaved?.(data.id);
    } catch (e: any) {
      if (progressRef.current) clearInterval(progressRef.current);
      console.error(e);
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setTimedProgress(0)
      setSavingNarration(false)
      setSaving(false);
    }
  };

  const toggleChild = (id: string) => {
    const willSelect = !selectedChildren.includes(id);
    setSelectedChildren((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    // Spring scale animation on select
    if (willSelect) {
      const scaleVal = getChildScale(id);
      Animated.sequence([
        Animated.spring(scaleVal, { toValue: 1.08, useNativeDriver: true, speed: 20, bounciness: 12 }),
        Animated.spring(scaleVal, { toValue: 1.0, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }
  };

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
              className={`px-4 py-2 rounded-full border ${sel ? "bg-[#c59a5f] border-[#c59a5f]" : `${isDark ? "border-slate-500" : "border-slate-300"}`
                }`}
            >
              <Text className={`font-semibold ${sel ? "text-white" : badgeText} text-sm`}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };


  // const [permission, requestPermission] = useCameraPermissions();
  // const cameraGranted = permission.granted;

  const audioGranted = Boolean(audioPermissionGranted);
  const permissionsGranted = audioGranted;

  const modalCard = isDark ? 'bg-[#111827] border border-gray-700' : 'bg-white border border-gray-200';
  const headingText = isDark ? 'text-gray-100' : 'text-slate-600';
  const bodyText = isDark ? 'text-gray-400' : 'text-gray-500';
  const accentColor = isDark ? '#60A5FA' : '#1D4ED8';

  useEffect(() => {
    const initPermissionsAndData = async () => {

      // try {
      //   // await requestPermission();
      // } catch (error) {
      //   console.warn('Error requesting camera permission:', error);
      // }

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
    };

    initPermissionsAndData();
  }, [])


  useEffect(() => {
    if (audioPermissionGranted === null) {
      return;
    }

    if (!audioPermissionGranted) {
      if (!permissionModalDismissed) {
        setIsPermissionModalVisible(true);
      }
      return;
    }

    setIsPermissionModalVisible(false);
    if (permissionModalDismissed) {
      setPermissionModalDismissed(false);
    }
  }, [audioPermissionGranted, permissionModalDismissed]);

  const handleDismissPermissionModal = () => {
    setPermissionModalDismissed(true);
    setIsPermissionModalVisible(false);
  };


  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Unable to open settings:', error);
    }
  };


  return (
    <>
      <Modal
        visible={isPermissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissPermissionModal}>
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

      {showAddForm && (
        <View style={{ zIndex: 10 }} className={`inset-0 mb-8 rounded-lg p-0 ${formCardClass}`}>
          <ScrollView showsVerticalScrollIndicator={false} >
            <View>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: children.length ? 20 : 0 }}>
        <View className="space-y-6">
          <View className={`${children.length ? "mb-4" : "mb-0"}`}>
            <View className={`${children.length ? "mb-6 " : "mb-0"} w-full justify-center items-center`}>
              {children.length ?
                <Text className={`${isDark ? "text-gray-100" : "text-slate-400 "} mt-2 mb-4 font-semibold`}>
                  Choose who this story is for
                </Text>
                : null}
              <View className="flex-wrap flex-row items-center justify-center">
                {!childrenLoading && children.length ? children.map((child, i) => {
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

                {!children.length && childrenLoading ?
                  <ActivityIndicator size="large" color="#334155" />
                  : null}

              </View>

              {!showAddForm && !children.length && !childrenLoading ?
                <View className="w-full">
                  <View className="items-center justify-center">
                    <View className={`border-2 border-slate-200 items-center justify-center w-16 h-16 ${isDark ? "bg-slate-700 " : "bg-slate-100 "} rounded-full`}>
                      <Ionicons name="person-add-outline" size={20} color="#94a3b8" />
                    </View>
                    <Text className={`text-center mt-4 ${bodyText}`}>
                      You have not yet added a child to Hey Dad
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{ alignItems: 'center', justifyContent: "center" }}
                    onPress={() => setShowAddForm(true)}
                    className={`my-4 flex-row w-full ${isDark ? "bg-slate-700" : "bg-slate-800"} rounded-md p-4 items-center justify-center`}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text className={`ml-2 ${infoBody} font-medium`}>Add a child to assign this story</Text>
                  </TouchableOpacity>
                </View>
                : null}
            </View>

            {children.length ?
              <>
                <TextInput
                  style={{
                    width: '100%',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: isDark ? '#f3f4f6' : '#1B2838',
                    backgroundColor: isDark ? '#1f2937' : '#FAFAF8',
                    borderWidth: 0,
                    borderBottomWidth: titleFocused ? 2 : 1,
                    borderBottomColor: titleFocused ? '#D4A853' : (isDark ? '#4b5563' : '#d1cdc6'),
                    borderRadius: 0,
                  }}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. First Day of Kindergarten"
                  placeholderTextColor={isDark ? '#6b7280' : '#94a3b8'}
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => setTitleFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => {
                    router.replace({
                      pathname: "/(tabs)/memories/ideas",
                      params: { tab: tab }
                    })
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 10, marginBottom: 4 }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#D4A853" />
                  <Text style={{ marginLeft: 4, fontSize: 13, color: '#D4A853', fontWeight: '600' }}>Need ideas?</Text>
                </TouchableOpacity>
              </>
              : null}
          </View>

          {!isAudioNote && children.length ? <ImageUpload imageFile={imageFile} setImageFile={setImageFile} /> : null}

          {/* Audio */}
          <View className="mt-3 items-center gap-3">
            {(!isAudioNote && children.length && !audioUri) ? (
              <View style={{ marginBottom: 24, marginTop: 16, alignItems: 'center' }}>
                <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
                  {/* Pulsing ring — gold when idle, red when recording */}
                  {!isRecording && (
                    <Animated.View style={{
                      position: 'absolute',
                      width: 88,
                      height: 88,
                      borderRadius: 44,
                      borderWidth: 3,
                      borderColor: '#D4A853',
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseOpacity,
                    }} />
                  )}
                  {isRecording && (
                    <Animated.View style={{
                      position: 'absolute',
                      width: 88,
                      height: 88,
                      borderRadius: 44,
                      borderWidth: 3,
                      borderColor: '#E74C3C',
                      transform: [{ scale: recordPulse }],
                      opacity: recordPulseOpacity,
                    }} />
                  )}
                  <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    accessibilityLabel={isRecording ? "Stop recording" : "Start narration recording"}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: isRecording ? '#E74C3C' : '#1B2838',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      elevation: 4,
                    }}>
                    <Ionicons
                      name={isRecording ? "pause" : "mic"}
                      size={28}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 15, fontWeight: '600', color: isDark ? '#f3f4f6' : '#1B2838' }}>
                  {fmt(durationSec)} / 2:00
                </Text>
                <Text style={{ marginTop: 4, textAlign: 'center', fontSize: 13, color: isRecording ? '#E74C3C' : (isDark ? '#6b7280' : '#94a3b8') }}>
                  {isRecording ? 'Recording...' : 'Tap to start recording'}
                </Text>
              </View>) : null}


            {!isRecording && audioUri && (
              <View className="mb-4 flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={togglePlay}
                  className="px-4 py-2 rounded-lg bg-slate-800"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={18}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-white font-semibold">
                      {isPlaying ? "Pause" : "Play"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={retakeNarration}
                  className={`px-4 py-2 rounded-lg border border-slate-300`}
                >
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="restart"
                      size={18}
                      color={isDark ? "white" : "#0f172a"}
                      style={{ marginRight: 6 }}
                    />
                    <Text className={` ${isDark ? "text-white" : "text-slate-600"} text-slate-800 font-semibold`}>Retake</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}


          </View>

          {/* Meta */}
          {children.length ?
            <>
              <View className={`gap-4 ${isAudioNote ? "" : ""}`}>
                <View className="mb-1">
                  <TextInput
                    className={`w-full h-32 rounded-lg border px-3 py-3 ${isDark ? "border-slate-500 text-gray-100" : "border-slate-300 text-slate-700"}`}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add a short note..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    textAlignVertical="top"
                    numberOfLines={isAudioNote ? 8 : 1}
                  />
                </View>
              </View>
              <View className="gap-3">
                <Text className={`text-sm ${isDark ? "text-gray-100" : "text-slate-600 "} font-semibold mt-2`}>Unlock</Text>
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
              <View className="pt-2 mt-4">
                <TouchableOpacity
                  disabled={(!audioUri && !isAudioNote) || !title.trim() || selectedChildren.length === 0 || saving}
                  onPress={save}
                  className={`bg-slate-700 w-full items-center px-5 py-4 rounded-lg ${(!audioUri && !isAudioNote) || !title.trim() || selectedChildren.length === 0 || saving
                    ? "opacity-50"
                    : ""
                    }`}>
                  <View className="flex-row items-center">
                    <Text className="text-white font-semibold">
                      Save Story
                    </Text>
                  </View>
                </TouchableOpacity>
                <Text className="mt-4 text-center font-semibold text-sm text-slate-600 mb-1">60-90 seconds is perfect. Your voice is the gift - don't overthink it.</Text>
              </View>

            </>
            : null}
        </View>
      </ScrollView>
    </>
  );
};

export default ImageNarration;
