import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export const ThumbnailSelector = ({
  thumbnails = [],
  onThumbnailSelect,
  onContinue,
  selectedThumbnail = null,
  isLoading = false,
  isDark = false,
}: {
  thumbnails?: any[];
  onThumbnailSelect: (thumbnail: any, index: number) => void;
  onContinue: () => void;
  selectedThumbnail?: any;
  isLoading?: boolean;
  isDark?: boolean;
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleThumbnailClick = (thumbnail, index: number) => {
    onThumbnailSelect(thumbnail, index);
  };

  const thumbnailWidth = (screenWidth - 48) / 2 - 8;
  const surface = isDark ? 'bg-[#1f2937]' : 'bg-white';
  const modalSurface = isDark ? 'bg-[#0f172a]' : 'bg-white';
  const headingText = isDark ? 'text-gray-100' : 'text-gray-800';
  const subheadingText = isDark ? 'text-gray-300' : 'text-gray-600';
  const placeholderColor = isDark ? 'bg-gray-700' : 'bg-gray-200';
  const borderSelected = 'border-4 border-blue-500 shadow-lg';
  const borderDefault = isDark ? 'border border-gray-700 shadow-sm' : 'border border-gray-200 shadow-sm';
  const continueEnabled = isDark ? 'bg-gray-700' : 'bg-gray-800';
  const continueDisabled = isDark ? 'bg-gray-600' : 'bg-gray-300';
  const continueText = 'text-white font-medium text-center';
  const timeBadge = 'absolute bottom-1 right-1 bg-black/75 rounded flex-row items-center px-2 py-1';

  if (isLoading) {
    return (
      <View className={`w-full max-w-4xl mx-auto p-6 rounded-lg shadow-lg ${surface}`}>
        <View className="text-center items-center">
          <View className="flex-row items-center gap-3 mb-4">
            <ActivityIndicator size="small" color={isDark ? '#cbd5f5' : '#6B7280'} />
            <Text className={`text-lg font-medium ${subheadingText}`}>
              Generating thumbnails...
            </Text>
          </View>
          <View className="flex-row justify-center gap-4 flex-wrap">
            {[...Array(4)].map((_, i) => (
              <View
                key={i}
                className={`${placeholderColor} rounded-lg`}
                style={{
                  width: thumbnailWidth,
                  height: thumbnailWidth * 0.6,
                }}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (thumbnails.length === 0) {
    return (
      <View className={`w-full max-w-4xl mx-auto p-6 rounded-lg shadow-lg ${surface}`}>
        <View className="text-center items-center">
          <Ionicons name="image" size={48} color={isDark ? '#94A3B8' : '#D1D5DB'} className="mb-3" />
          <Text className={subheadingText}>No thumbnails available</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`w-full absolute inset-0 max-w-4xl mx-auto p-6 pt-16 rounded-lg shadow-lg ${modalSurface}`}>
      <View className="mb-6 items-center">
        <Text className={`font-merriweather text-xl font-semibold mb-2 text-center ${headingText}`}>
          Choose Your Video Thumbnail
        </Text>
        <Text className={`${subheadingText} text-center`}>
          Select the frame that best represents your video
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap justify-between mb-6">
          {thumbnails.map((thumbnail, index) => {
            const isSelected =
              selectedThumbnail && selectedThumbnail.time === thumbnail.time;

            return (
              <TouchableOpacity
                key={index}
                className={`relative mb-4 rounded-lg overflow-hidden ${isSelected ? borderSelected : borderDefault}`}
                style={{
                  width: thumbnailWidth,
                  transform: isSelected ? [{ scale: 1.02 }] : [{ scale: 1 }],
                }}
                onPress={() => handleThumbnailClick(thumbnail, index)}
                activeOpacity={0.8}
              >
                <View className={`relative ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Image
                    source={{ uri: thumbnail.uri }}
                    className="w-full object-cover"
                    style={{
                      height: thumbnailWidth * 0.6,
                    }}
                    resizeMode="cover"
                  />

                  {/* Time overlay */}
                  <View className={timeBadge}>
                    <Ionicons name="time" size={12} color="white" />
                    <Text className="text-white text-xs ml-1">
                      {formatTime(thumbnail.time)}
                    </Text>
                  </View>

                  {/* Selection indicator */}
                  {isSelected && (
                    <View className="absolute inset-0 bg-blue-500/20 items-center justify-center">
                      <View className="bg-blue-500 rounded-full p-2">
                        <Ionicons name="checkbox" size={16} color="white" />
                      </View>
                    </View>
                  )}

                  {/* Thumbnail number */}
                  <View className={`absolute top-2 left-2 bg-gray-800 rounded-full w-6 h-6 items-center justify-center border ${isDark ? 'border-gray-600' : 'border-white'}`}>
                    <Text className="text-white text-xs font-medium">
                      {index + 1}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {!selectedThumbnail && (
        <View className="items-center mb-4">
          <Text className={`font-merriweather text-sm text-center ${subheadingText}`}>
            Tap on a thumbnail to select it as your video cover
          </Text>
        </View>
      )}

      <View className="items-end">
        <TouchableOpacity
          onPress={onContinue}
          disabled={!selectedThumbnail}
          className={`w-full px-4 py-4 rounded-md ${selectedThumbnail ? continueEnabled : continueDisabled}`}
          style={{ opacity: selectedThumbnail ? 1 : 0.6 }}
        >
          <Text className={continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
