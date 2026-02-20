import { Platform } from 'react-native'
import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as tus from "tus-js-client";
import { supabase } from 'utils/supabase';

const TUS_ENDPOINT = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;
const videoExtension = Platform.OS === 'ios' ? '.mov' : '.mp4'
const videoMIME = Platform.OS === 'ios' ? 'video/mov' : 'video/mp4'

const saveVideoLocally = async (videoId: string, videoUri: string, thumbnailUri?: any) => {
  const videoDir = `${FileSystem.documentDirectory}videos/`;
  const videoPath = `${videoDir}${videoId}${videoExtension}`;
  const thumbnailPath = thumbnailUri ? `${videoDir}${videoId}_thumb.jpg` : null;

  // Ensure full directory path exists (videoId may contain subdirectories like userId/)
  const videoFileDir = videoPath.substring(0, videoPath.lastIndexOf('/'));
  await FileSystem.makeDirectoryAsync(videoFileDir, { intermediates: true });

  // Actually copy the video file to local storage
  await FileSystem.copyAsync({ from: videoUri, to: videoPath });

  // Copy thumbnail if provided
  if (thumbnailUri?.uri && thumbnailPath) {
    try {
      await FileSystem.copyAsync({ from: thumbnailUri.uri, to: thumbnailPath });
    } catch (e) {
      console.log('Thumbnail copy failed:', e);
    }
  }

  return { videoUri: videoPath, thumbnailPath };
};

const getVideoLocally = async (videoId: string) => {
  const videoDir = `${FileSystem.documentDirectory}videos/`;
  const videoPath = `${videoDir}${videoId}${videoExtension}`;
  const thumbnailPath = `${videoDir}${videoId}_thumb.jpg`;

  const videoExists = await FileSystem.getInfoAsync(videoPath);
  const thumbnailExists = await FileSystem.getInfoAsync(thumbnailPath);

  if (!videoExists.exists) return null;

  return {
    videoUri: videoPath,
    thumbnailUri: thumbnailExists.exists ? thumbnailPath : null,
  };
};

const removeVideoLocally = async (videoId: string) => {
  const videoDir = `${FileSystem.documentDirectory}videos/`;
  const videoPath = `${videoDir}${videoId}${videoExtension}`;
  const thumbnailPath = `${videoDir}${videoId}_thumb.jpg`;

  try {
    await FileSystem.deleteAsync(videoPath, { idempotent: true });
    await FileSystem.deleteAsync(thumbnailPath, { idempotent: true });
  } catch (error) {
    console.log('Error removing local files:', error);
  }
};

export function useVideoUploadSession(videoId: string) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error" | "retrying"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [showRetryModal, setShowRetryModal] = useState(false);

  const metadataKey = `video-${videoId}`;

  const saveLocal = async (
    videoUri: string,
    thumbnailUri: any,
    metadata: Record<string, any>,
  ): Promise<void> => {
    setStatus("uploading");
    setProgress(40);

    await saveVideoLocally(videoId, videoUri, thumbnailUri);
    await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));

    setProgress(100);
    setStatus("success");
  };

  const upload = useCallback(
    async (
      videoUri: string,
      thumbnailUri: any,
      metadata: Record<string, any>,
      videoResult: any,
      cb?: () => void,
    ): Promise<void> => {
      try {
        setStatus("uploading");
        setProgress(0);
        setError(null);
        await saveVideoLocally(videoId, videoUri, thumbnailUri);
        await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          throw new Error('Not authenticated. Please sign in again.');
        }

        const videoFileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!videoFileInfo.exists) {
          throw new Error('Video file not found. Please record again.');
        }

        // Check file size — warn if over 100MB
        if (videoFileInfo.size && videoFileInfo.size > 100 * 1024 * 1024) {
          console.warn(`Video file is large: ${(videoFileInfo.size / 1024 / 1024).toFixed(1)}MB`);
        }

        // Convert local file URI to blob for TUS upload
        let blob: Blob;
        try {
          const blobResponse = await fetch(videoUri);
          blob = await blobResponse.blob();
        } catch (fetchErr) {
          console.warn("fetch() blob conversion failed, trying base64 fallback:", fetchErr);
          // Fallback: read as base64 and convert to blob
          const base64 = await FileSystem.readAsStringAsync(videoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: videoMIME });
        }

        return new Promise((resolve, reject) => {
          const tusUpload = new tus.Upload(blob, {
            endpoint: TUS_ENDPOINT,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              authorization: `Bearer ${session.access_token}`,
              "x-upsert": "true",
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
              bucketName: "videos",
              objectName: metadata.file_path,
              contentType: videoMIME,
              cacheControl: "3600",
            },
            chunkSize: 6 * 1024 * 1024,
            onError: (tusError) => {
              console.error("TUS upload failed:", tusError);
              const message = tusError?.message || "Upload failed. Check your connection and try again.";
              setError(message);
              setShowRetryModal(true);
              setStatus("error");
              reject(new Error(message));
            },
            onProgress: (uploaded, total) => {
              const percentage = Math.min(Math.floor((uploaded / total) * 100), 100);
              console.log(`Upload progress: ${uploaded}/${total} (${percentage}%)`);
              setProgress(percentage);
            },
            onSuccess: async () => {
              try {
                let thumbnailUploadData = null;
                // Normalize thumbnail URI — accept both {uri: string} and plain string
                const thumbUri = thumbnailUri?.uri || (typeof thumbnailUri === 'string' && thumbnailUri.length > 0 ? thumbnailUri : null);

                if (thumbUri) {
                  try {
                    const thumbnailFileName = `${session.user.id}/${Date.now()}_thumb.jpg`;
                    const thumbnailBase64 = await FileSystem.readAsStringAsync(thumbUri, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    const thumbnailBytes = new Uint8Array(
                      atob(thumbnailBase64)
                        .split('')
                        .map(char => char.charCodeAt(0))
                    );

                    const { data, error: thumbnailUploadError } = await supabase.storage
                      .from("videos")
                      .upload(thumbnailFileName, thumbnailBytes, {
                        contentType: 'image/jpeg'
                      });

                    if (thumbnailUploadError) {
                      console.warn("Thumbnail upload failed (non-fatal):", thumbnailUploadError);
                    } else {
                      thumbnailUploadData = data;
                    }
                  } catch (thumbErr) {
                    console.warn("Thumbnail processing failed (non-fatal):", thumbErr);
                  }
                }

                const { selectedChildren, ...videoData } = metadata;

                // Insert video record
                const { data: video, error: videoError } = await supabase
                  .from("videos")
                  .insert([
                    {
                      ...videoData,
                      user_id: session?.user.id,
                      thumbnail_path: thumbnailUploadData?.path || null,
                      processing_status: "processing",
                      processing_progress: 80,
                    },
                  ])
                  .select()
                  .single();

                if (videoError) throw new Error(`Failed to save video record: ${videoError.message}`);

                // Create video-children relationships
                if (selectedChildren?.length) {
                  const videoChildrenData = selectedChildren.map((childId) => ({
                    video_id: video.id,
                    child_id: childId,
                  }));

                  const { error: relationError } = await supabase
                    .from("video_children")
                    .insert(videoChildrenData);

                  if (relationError) {
                    console.warn("Failed to link children (non-fatal):", relationError);
                  }
                }

                // Update video status to completed
                const { error: updateError } = await supabase
                  .from("videos")
                  .update({
                    processing_status: "completed",
                    processing_progress: 100,
                  })
                  .eq("id", video.id);

                if (updateError) {
                  console.warn("Failed to update video status (non-fatal):", updateError);
                }

                setStatus("success");
                setShowRetryModal(false);
                setError(null);

                // Clean up local files and storage
                await removeVideoLocally(videoId);
                await AsyncStorage.multiRemove([
                  metadataKey,
                  "active-upload-id",
                  `tus-url-${videoId}`
                ]);

                resolve(cb?.());
              } catch (err: any) {
                console.error("Post-upload processing error:", err);
                setError(err.message || "Failed to save video after upload.");
                setStatus("error");
                setShowRetryModal(true);
                reject(err);
              }
            },
          });

          // Handle resumable uploads
          tusUpload.findPreviousUploads().then((previousUploads) => {
            if (previousUploads.length > 0) {
              console.log("Resuming previous upload");
              tusUpload.resumeUpload(previousUploads[0]);
            } else {
              console.log("Starting new upload");
              tusUpload.start();
            }
          }).catch((findErr) => {
            console.warn("Could not check previous uploads, starting fresh:", findErr);
            tusUpload.start();
          });
        });
      } catch (err: any) {
        console.error("Upload error:", err);
        const message = err.message || "Unexpected error during upload.";
        setError(message);
        setShowRetryModal(true);
        setStatus("error");
      }
    },
    [videoId, metadataKey],
  );

  const resumeUploadIfExists = useCallback(async () => {
    try {
      const savedMetadata = await AsyncStorage.getItem(metadataKey);
      const savedVideo = await getVideoLocally(videoId);

      if (savedMetadata && savedVideo) {
        console.log("Found incomplete upload, showing retry modal");
        setShowRetryModal(true);
      }
    } catch (error) {
      console.log("Error checking for resumable upload:", error);
    }
  }, [videoId, metadataKey]);

  const retry = useCallback(
    async (cb?: () => void) => {
      try {
        const savedMetadata = await AsyncStorage.getItem(metadataKey);
        const savedVideo = await getVideoLocally(videoId);

        if (!savedMetadata || !savedVideo) {
          console.log("No saved upload data found to retry");
          setError("No saved upload found. Please record again.");
          setShowRetryModal(true);
          return;
        }

        console.log("Retrying upload");
        setStatus("uploading");
        setError(null);

        // Normalize thumbnail — upload() expects {uri: string} or falsy
        const thumbnailForUpload = savedVideo.thumbnailUri
          ? { uri: savedVideo.thumbnailUri }
          : null;

        const fileInfo = await FileSystem.getInfoAsync(savedVideo.videoUri);
        if (!fileInfo.exists) {
          setError("Video file was deleted. Please record again.");
          setStatus("error");
          return;
        }

        await upload(
          savedVideo.videoUri,
          thumbnailForUpload,
          JSON.parse(savedMetadata),
          fileInfo,
          cb,
        );
      } catch (error: any) {
        console.error("Retry error:", error);
        setError(error?.message || "Failed to retry upload. Please try again.");
        setStatus("error");
        setShowRetryModal(true);
      }
    },
    [videoId, metadataKey, upload],
  );

  const flush = useCallback(async () => {
    // Always reset UI state so the modal dismisses immediately
    setError(null);
    setShowRetryModal(false);
    setStatus("idle");
    setProgress(0);

    try {
      const savedMetadata = await AsyncStorage.getItem(metadataKey);
      const savedVideo = await getVideoLocally(videoId);

      if (savedMetadata || savedVideo) {
        console.log("Flushing saved data");
        await removeVideoLocally(videoId);
        await AsyncStorage.multiRemove([
          metadataKey,
          "active-upload-id",
          `tus-url-${videoId}`
        ]);
      }
    } catch (error) {
      console.error("Flush error:", error);
    }
  }, [videoId, metadataKey]);

  useEffect(() => {
    resumeUploadIfExists();
  }, [resumeUploadIfExists]);

  return {
    upload,
    saveLocal,
    progress,
    status,
    error,
    retry,
    showRetryModal,
    flush,
  };
}
