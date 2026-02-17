import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  ScrollView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, } from 'hooks/useAuth';
import { supabase } from 'utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import ChildrenGrid from 'components/ChildrenGrid';
import { useTheme } from '../../providers/ThemeProvider';
import { generateChildAccessCode, normalizeAccessCode } from 'utils/accessCode';


const ChildrenScreen = () => {
  const { height } = Dimensions.get('window')
  const { signOut, setHasChild } = useAuth()
  const [loading, setLoading] = useState(false)
  const [children, setChildren] = useState([])
  const [childImageUrls, setChildImageUrls] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [formLoading, setFormLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    birthdate: new Date(),
    imageFile: "",
    imagePreview: "",
  });
  const [error, setError] = useState("");
  const [generatingCodes, setGeneratingCodes] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const { user } = useAuth()
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const screenBackgroundClass = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const headerBackgroundColor = isDark ? '#1f2937' : '#1e293b';
  const contentBackgroundClass = isDark ? 'bg-gray-900' : 'bg-gray-100';
  const headlineTextClass = isDark ? 'text-gray-100' : 'text-slate-600';
  const bodyTextClass = isDark ? 'text-gray-400' : 'text-gray-400';
  const formCardClass = isDark ? 'bg-[#1f2937]' : 'bg-white';
  const labelTextClass = isDark ? 'text-gray-200' : 'text-gray-900';
  const inputClass = isDark
    ? 'w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100'
    : 'w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-900';
  const uploadBorderClass = isDark ? 'border-gray-600' : 'border-gray-400';
  const uploadTextClass = isDark ? 'text-gray-300' : 'text-gray-400';
  const uploadAccentTextClass = isDark ? 'text-green-400' : 'text-green-700';
  const cancelButtonClass = isDark ? 'flex-1 border border-gray-600 rounded-md px-4 py-2' : 'flex-1 border border-gray-400 rounded-md px-4 py-2';
  const cancelButtonTextClass = isDark ? 'text-center text-gray-200' : 'text-center text-gray-900';
  const addButtonClass = (disabled: boolean) => {
    if (disabled) {
      return isDark ? 'bg-gray-600 flex-row items-center px-4 py-2 rounded-md' : 'bg-gray-300 flex-row items-center px-4 py-2 rounded-md';
    }
    return isDark
      ? 'flex-1 bg-slate-700 flex-row items-center px-4 py-2 rounded-md'
      : 'flex-1 bg-[#2C3E50] flex-row items-center px-4 py-2 rounded-md';
  };
  const addButtonTextClass = 'flex-1 text-center text-white font-medium';
  const ctaButtonClass = isDark ? 'bg-gray-700 rounded-lg py-4 items-center' : 'bg-slate-700 rounded-lg py-4 items-center';
  const closeIconColor = isDark ? '#cbd5f5' : '#9CA3AF';
  const uploadIconColor = isDark ? '#94A3B8' : '#9CA3AF';
  const previewBorderClass = isDark ? 'border-gray-600' : 'border-gray-400';
  const addAnotherTextClass = 'text-white font-medium ml-2';

  const resetForm = () => {
    setFormData({
      name: "",
      birthdate: new Date(),
      imageFile: "",
      imagePreview: "",
    });
    setShowAddForm(false);
    setEditingChild(null);
    setError("");
    setSuccessMessage("");
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
  };

  const fetchChildren = async () => {
    if (user) {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("children")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setChildren(data || []);

        if (data && data.length > 0) {
          await loadChildImageUrls(data);
        }
      } catch (error) {
        console.error("Error fetching children:", error);
        setError("Failed to load children");
      } finally {
        setLoading(false);
      }
    }
  };


  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
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

  const handleGenerateCode = async (childId: string) => {
    if (!user?.id) return;

    const code = normalizeAccessCode(generateChildAccessCode());
    setGeneratingCodes((prev) => ({ ...prev, [childId]: true }));
    setSuccessMessage("");
    setError("");

    try {
      const { data, error } = await supabase
        .from("children")
        .update({
          access_code: code,
          access_code_generated_at: new Date().toISOString(),
        })
        .eq("id", childId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      setChildren((prev) =>
        prev.map((child: any) =>
          child.id === childId ? { ...child, access_code: data.access_code } : child,
        ),
      );
      setSuccessMessage("New access code generated.");
    } catch (err: any) {
      console.error("Error generating code:", err);
      setError(err?.message || "Unable to generate code. Please try again.");
    } finally {
      setGeneratingCodes((prev) => ({ ...prev, [childId]: false }));
    }
  };

  const getNextUnlockDate = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    const nextBirthday = new Date(
      today.getFullYear(),
      birth.getMonth(),
      birth.getDate(),
    );

    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    return nextBirthday;
  };

  const getAgeDescription = (age) => {
    if (age < 1) return "Less than a year old";
    if (age === 1) return "1 year old";
    return `${age} years old`;
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: "",
    }));
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
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.log(error)
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (child) => {
    setEditingChild(child);
    setFormData({
      name: child.name,
      birthdate: child.birthdate,
      imageFile: null,
      imagePreview: "",
    });
    setShowAddForm(true);
  };

  const handleDelete = async (childId: string) => {
    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", childId);

      if (error) throw error;

      setMessage("Child deleted successfully");
      await fetchChildren();
    } catch (error) {
      setError("Failed to delete child");
    }
  };


  useEffect(() => {
    fetchChildren();
  }, [user?.id]);

  return (
    <SafeAreaView className={`flex-1 ${screenBackgroundClass}`}>
      <StatusBar barStyle={isDark ? 'light' : 'dark'} backgroundColor={headerBackgroundColor} />

      {/* Main Content */}
      <View className={`flex-1 px-0 ${contentBackgroundClass}`}>
        {/* Title Section */}
        <View className="px-4 mt-6 mb-6">
          <Text className={`text-2xl font-merriweather mb-2 ${headlineTextClass}`}>Your Children</Text>
          <Text className={`text-base ${bodyTextClass}`}>
            Create lasting stories and legacy videos for the ones you love most.
          </Text>
        </View>

        {showAddForm && (
          <View style={{ zIndex: 10, height }} className={`absolute inset-0 mb-8 rounded-lg p-6 ${formCardClass}`}>
            <ScrollView>
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
                      {showDatePicker && (
                        <DateTimePicker
                          textColor={isDark ? "white" : "black"}
                          value={new Date(formData.birthdate) || new Date()}
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

        {error ? (
          <View className="mx-4 mb-4 rounded-lg bg-red-500/10 border border-red-500/40 px-4 py-3">
            <Text className="text-red-500 font-semibold text-sm">{error}</Text>
          </View>
        ) : null}
        {successMessage ? (
          <View className="mx-4 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/40 px-4 py-3">
            <Text className="text-emerald-500 font-semibold text-sm">{successMessage}</Text>
          </View>
        ) : null}

        {children.length > 0 && (
          <ChildrenGrid
            {...{
              children,
              childImageUrls,
              calculateAge,
              getAgeDescription,
              getNextUnlockDate,
              handleEdit,
              handleDelete,
              handleGenerateCode,
              generatingCodes,
              isDark,
            }}
          />
        )}
        {!children.length ?
          <>
            <View className="mb-4 items-center justify-centerborder border-slate-400">
              <View className={`border-2 border-slate-200 items-center justify-center w-16 h-16 ${isDark ? "bg-slate-700" : "bg-slate-100"} rounded-full`}>
                <Ionicons name="person-add-outline" size={20} color="#94a3b8" />
              </View>
              <Text className={`text-center mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                You have not yet added a child to Hey Dad
              </Text>
            </View>
          </>
          : null}

        <View className={`w-full px-4 py-4 pt-0`}>
          <TouchableOpacity
            onPress={() => setShowAddForm(true)}
            className={ctaButtonClass}>
            <View className="flex-row items-center">
              <Ionicons name="add" size={20} color="white" className="mr-2" />
              <Text className={addAnotherTextClass}>Add {children.length ? "another" : "a"} child</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChildrenScreen;
