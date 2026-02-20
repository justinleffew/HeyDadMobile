import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  Dimensions,
  StatusBar,
  ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PhotoViewer({
  narration,
  imageUrl,
  audioUrl,
  onClose,
  visible = true,
}: {
  narration: {
    id: string;
    title?: string;
    created_at?: string;
    duration_seconds?: number;
  };
  imageUrl: string | null;
  audioUrl: string | null;
  onClose: () => void;
  visible?: boolean;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!audioUrl) return;

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(
        () => {}
      );

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true, isLooping: false }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.positionMillis != null)
            setCurrentTime(Math.floor(status.positionMillis / 1000));
          if (status.durationMillis != null)
            setDuration(Math.floor(status.durationMillis / 1000));
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        });
        setIsPlaying(true);
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            if (
              status.didJustFinish ||
              status.positionMillis >= (status.durationMillis || 0)
            ) {
              await soundRef.current.setPositionAsync(0);
            }
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
        }
      }
    } catch (err) {
      console.error("PhotoViewer audio error:", err);
    }
  };

  const handleClose = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onClose();
  }, [onClose]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Zoomable photo */}
        <ScrollView
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
          bouncesZoom
          style={{ flex: 1 }}
        >
          <View
            style={{
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                resizeMode="contain"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="image"
                  size={64}
                  color="rgba(255,255,255,0.3)"
                />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Audio play/pause button (centered) — only if audio exists */}
        {audioUrl ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={handlePlayPause}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(0,0,0,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={36}
                color="white"
                style={!isPlaying ? { marginLeft: 4 } : undefined}
              />
            </Pressable>
          </View>
        ) : null}

        {/* Top overlay — close button */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: 56,
            paddingHorizontal: 20,
          }}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "transparent"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 120,
            }}
          />
          <Pressable
            onPress={handleClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>

        {/* Bottom overlay — title, date, audio progress */}
        <View
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={{
              paddingHorizontal: 20,
              paddingBottom: 48,
              paddingTop: 60,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "700",
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {narration.title || "Untitled Story"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              {narration.created_at
                ? new Date(narration.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : ""}
            </Text>

            {/* Audio progress bar — only if audio exists */}
            {audioUrl ? (
              <>
                <View
                  style={{
                    marginTop: 12,
                    height: 3,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 2,
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      height: 3,
                      backgroundColor: "#D4A853",
                      borderRadius: 2,
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                    }}
                  >
                    {formatTime(currentTime)}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 11,
                    }}
                  >
                    {formatTime(
                      duration || narration.duration_seconds || 0
                    )}
                  </Text>
                </View>
              </>
            ) : null}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
