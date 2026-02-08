import { Platform } from 'react-native'
import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as tus from "tus-js-client";
import { supabase } from 'utils/supabase';

const TUS_ENDPOINT = `https://extfuvnhdbmpcxeecnqc.supabase.co/storage/v1/upload/resumable`;
const videoExtension = Platform.OS === 'ios' ? '.mov' : '.mp4'
const videoMIME = Platform.OS === 'ios' ? 'video/mov' : 'video/mp4'

const saveVideoLocally = async (videoId: string, videoUri: string, thumbnailUri?: any) => {
  const videoDir = `${FileSystem.documentDirectory}videos/`;
  const videoPath = `${videoDir}${videoId}${videoExtension}`;
  const thumbnailPath = thumbnailUri ? `${videoDir}${videoId}_thumb.jpg` : null;

  await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });

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
        setShowRetryModal(true);
        await saveVideoLocally(videoId, videoUri, thumbnailUri);
        await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          throw new Error('Not authenticated');
        }
        const fileName = `${session.user.id}/${Date.now()}${videoExtension}`;
        const videoFileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!videoFileInfo.exists) {
          throw new Error('Video file not found');
        }
        return new Promise((resolve, reject) => {
          const upload = new tus.Upload(videoResult, {
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
              cacheControl: 3600,
            },
            chunkSize: 6 * 1024 * 1024,
            onError: (error) => {
              console.log("Upload failed:", error);
              setError(error.message);
              setShowRetryModal(true);
              setStatus("error");
              reject(error);
            },
            onProgress: (uploaded, total) => {
              const percentage = ((uploaded / total) * 100).toFixed(2);
              console.log(uploaded, total, percentage + "%");
              setProgress(Math.min(Math.floor((uploaded / total) * 100), 100));
            },
            onSuccess: async () => {
              try {
                let thumbnailUploadData = null;
                if (thumbnailUri) {
                  const thumbnailFileName = `${session.user.id}/${Date.now()}_thumb.jpg`;
                  const thumbnailBase64 = await FileSystem.readAsStringAsync(thumbnailUri.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  const thumbnailBlob = new Uint8Array(
                    atob(thumbnailBase64)
                      .split('')
                      .map(char => char.charCodeAt(0))
                  );

                  const { data, error: thumbnailUploadError } = await supabase.storage
                    .from("videos")
                    .upload(thumbnailFileName, thumbnailBlob, {
                      contentType: 'image/jpeg'
                    });

                  if (thumbnailUploadError) throw thumbnailUploadError;
                  thumbnailUploadData = data;
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

                if (videoError) throw videoError;

                // Create video-children relationships
                if (selectedChildren?.length) {
                  const videoChildrenData = selectedChildren.map((childId) => ({
                    video_id: video.id,
                    child_id: childId,
                  }));

                  const { error: relationError } = await supabase
                    .from("video_children")
                    .insert(videoChildrenData);

                  if (relationError) throw relationError;
                }

                // Update video status to completed
                const { error: updateError } = await supabase
                  .from("videos")
                  .update({
                    processing_status: "completed",
                    processing_progress: 100,
                  })
                  .eq("id", video.id);

                if (updateError) throw updateError;

                setStatus("success");
                setShowRetryModal(false);
                setError("");

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
                setError(err.message);
                setStatus("error");
                reject(err);
              }
            },
          });

          // Handle resumable uploads
          upload.findPreviousUploads().then((previousUploads) => {
            if (previousUploads.length > 0) {
              upload.resumeUpload(previousUploads[0]);
            }
            upload.start();
          });
        });
      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || "Unexpected error");
        setStatus("error");
      }
    },
    [videoId],
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

        if (savedMetadata && savedVideo) {
          console.log("Retrying upload");
          // Read the video file as a blob-like object for TUS
          const fileInfo = await FileSystem.getInfoAsync(savedVideo.videoUri);
          await upload(
            savedVideo.videoUri,
            savedVideo.thumbnailUri || '',
            JSON.parse(savedMetadata),
            fileInfo,
            cb,
          );
        }
      } catch (error) {
        console.error("Retry error:", error);
        setError("Failed to retry upload");
        setStatus("error");
      }
    },
    [videoId, upload],
  );

  const flush = useCallback(async () => {
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
        setError("");
        setShowRetryModal(false);
        setStatus("idle");
      }
    } catch (error) {
      console.error("Flush error:", error);
    }
  }, [videoId]);

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
