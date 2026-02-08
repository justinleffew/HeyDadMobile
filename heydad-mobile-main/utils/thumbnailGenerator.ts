import * as VideoThumbnails from 'expo-video-thumbnails';

export const generateThumbnails = async (videoUri: string, count = 4, recordingTime) => {
  try {
    const duration = recordingTime || 10; // fallback duration if not provided
    const thumbnails = [];

    for (let i = 0; i < count; i++) {
      const progress = i / Math.max(count - 1, 1);
      let seekTime;

      if (duration < 1) {
        // For very short videos, use simple progression
        seekTime = Math.min(0.1 + progress * (duration - 0.2), duration - 0.1);
      } else if (duration <= 4) {
        // For short videos, spread evenly with minimum 0.5s
        seekTime = Math.max(0.5, progress * Math.max(duration - 0.5, 0));
      } else {
        // For longer videos, avoid very beginning and end
        const startOffset = Math.min(2, duration * 0.1);
        const endOffset = Math.min(2, duration * 0.1);
        const availableDuration = Math.max(duration - startOffset - endOffset, 1);
        seekTime = startOffset + progress * availableDuration;
      }

      // Final validation and clamping of seekTime
      seekTime = Math.max(0.01, Math.min(seekTime, duration - 0.01));

      console.log(
        `Generating thumbnail ${i + 1}/${count} at time ${seekTime.toFixed(2)}s (duration: ${duration.toFixed(2)}s)`
      );

      try {
        const { uri, width, height } = await VideoThumbnails.getThumbnailAsync(
          videoUri,
          {
            time: Math.floor(seekTime * 1000), // convert to milliseconds
            quality: 0.8, // 0.0 to 1.0
          }
        );

        thumbnails.push({
          uri,
          time: seekTime,
          width,
          height,
        });
      } catch (thumbError) {
        console.error(`Failed to generate thumbnail ${i + 1}:`, thumbError);
        // Continue with other thumbnails even if one fails
      }
    }

    if (thumbnails.length === 0) {
      throw new Error('Failed to generate any thumbnails');
    }

    return thumbnails;
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    throw error;
  }
};
