import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "providers/ThemeProvider";

interface ImageUploadProps {
  imageFile: ImagePicker.ImagePickerAsset | null;
  setImageFile: (file: ImagePicker.ImagePickerAsset | null) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ imageFile, setImageFile }) => {
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    try {
      setIsLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setImageFile(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';


  return (
    <View className={`rounded-xl`}>
      {!imageFile ? (
        <TouchableOpacity
          onPress={pickImage}
          activeOpacity={0.8}
          style={{
            borderRadius: 14,
            backgroundColor: isDark ? '#1f2937' : '#F5F0E8',
            paddingVertical: 28,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? '#374151' : '#EDE8E0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Ionicons name="camera-outline" size={28} color="#D4A853" />
          </View>

          <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#f3f4f6' : '#1B2838', marginBottom: 4 }}>
            Add a photo to set the scene
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? '#6b7280' : '#94a3b8' }}>
            Optional
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="space-y-4">
          <View className="relative">
            <Image
              source={{ uri: imageFile.uri }}
              style={{ width: '100%', height: 200 }}
              className={`w-full rounded-lg border ${isDark ? "border-slate-600" : "border-slate-200"}`}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={handleRemove}
              className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5"
            >
              <MaterialIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View className={`mt-4 items-center justify-between ${isDark ? "bg-slate-800" : "bg-slate-50"} rounded-lg p-3`}>
            <View className="flex-row items-center space-x-3">
              <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
                <Ionicons name="checkmark" size={18} color="#16a34a" />
              </View>
              <View className="ml-2 flex-1">
                <Text
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}
                >
                  Image Selected
                </Text>
                <Text className="text-xs text-slate-500">
                  {formatFileSize(imageFile.fileSize)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-blue-50 items-center mt-4 rounded-md p-2 px-4 w-full"
              onPress={pickImage}>
              <Text className="text-blue-600 font-medium text-sm">Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default ImageUpload;
