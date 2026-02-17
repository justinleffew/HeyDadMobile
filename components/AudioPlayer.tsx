import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';

export default function AudioPlayer({ uri }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadIfNeeded = async () => {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, isLooping: false }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        const s = status as AVPlaybackStatusSuccess;
        if (s.didJustFinish) setIsPlaying(false);
      });
    }
  };

  const replayFromStart = async () => {
    await loadIfNeeded();
    await soundRef.current!.setPositionAsync(0);
    await soundRef.current!.playAsync();
    setIsPlaying(true);
  };

  return (
    <View style={{ gap: 12 }}>
      <TouchableOpacity onPress={replayFromStart}>
        <LinearGradient
          colors={["#D4B996", "#C2A16C", "#D4B996"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ justifyContent: "center", alignItems: "center", flexDirection: "row", paddingTop: 12, paddingBottom: 12, borderRadius: 6 }}
          className="overflow-hidden px-5 rounded-md justify-center items-center">
          <Ionicons
            name="play-circle"
            size={24}
            color="white" />

          <Text className="ml-3 text-white font-medium text-center">Play</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
