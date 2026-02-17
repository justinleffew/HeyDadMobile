import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "utils/supabase";

type CommentData = {
  content: string;
  author: string;
  author_id: string;
  timestamp: string;
  timeInSeconds: number;
};

export const useVideoComments = (videoId: string) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCancelledRef = useRef(false);

  const loadComments = useCallback(async () => {
    if (!videoId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('video_comments')
        .select('comments_data')
        .eq('video_id', videoId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!isCancelledRef.current) {
        setComments(data?.comments_data || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (!isCancelledRef.current) {
        setError(`Failed to load comments: ${message}`);
        setComments([]);
      }
    } finally {
      if (!isCancelledRef.current) {
        setLoading(false);
      }
    }
  }, [videoId]);

  const updateNotes = useCallback(async (notes: string) => {
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error: saveError } = await supabase
        .from('videos')
        .update({ notes })
        .eq('id', videoId)
        .select()
        .single();

      if (saveError) throw saveError;

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save notes: ${message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [videoId]);

  const saveComments = useCallback(async (newCommentsData: any[]) => {
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error: saveError } = await supabase
        .from('video_comments')
        .upsert({
          video_id: videoId,
          comments_data: newCommentsData
        }, {
          onConflict: 'video_id'
        })
        .select();

      if (saveError) throw saveError;

      setComments(newCommentsData);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save comments: ${message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [videoId]);

  const addComment = useCallback(async (commentData: CommentData) => {
    if (!commentData.content?.trim()) {
      throw new Error('Comment content is required');
    }

    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      author: commentData.author || 'Anonymous',
      author_id: commentData.author_id || null,
      content: commentData.content.trim(),
      timestamp: commentData.timestamp || '0:00',
      timeInSeconds: commentData.timeInSeconds || 0,
      createdAt: new Date().toISOString(),
      replies: []
    };

    // Use functional update to avoid stale closure
    const updatedComments = await new Promise<any[]>((resolve) => {
      setComments((prev) => {
        const next = [...prev, newComment];
        resolve(next);
        return prev; // Don't update yet - saveComments will do it
      });
    });

    await saveComments(updatedComments);
    return newComment;
  }, [saveComments]);

  const addReply = useCallback(async (parentId: string | number, replyData: any) => {
    if (!replyData.content?.trim()) {
      throw new Error('Reply content is required');
    }

    const newReply = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      author: replyData.author || 'Anonymous',
      author_id: replyData.author_id || null,
      content: replyData.content.trim(),
      timestamp: replyData.timestamp || '0:00',
      timeInSeconds: replyData.timeInSeconds || 0,
      createdAt: new Date().toISOString(),
      parentId
    };

    const updatedComments = await new Promise<any[]>((resolve) => {
      setComments((prev) => {
        const next = prev.map((comment: any) =>
          comment.id === parentId
            ? { ...comment, replies: [...(comment.replies || []), newReply] }
            : comment
        );
        resolve(next);
        return prev;
      });
    });

    await saveComments(updatedComments);
    return newReply;
  }, [saveComments]);

  const deleteComment = useCallback(async (commentId: string | number) => {
    const updatedComments = await new Promise<any[]>((resolve) => {
      setComments((prev) => {
        const next = prev.filter((comment: any) => comment.id !== commentId);
        resolve(next);
        return prev;
      });
    });
    await saveComments(updatedComments);
  }, [saveComments]);

  const deleteReply = useCallback(async (parentId: string | number, replyId: string | number) => {
    const updatedComments = await new Promise<any[]>((resolve) => {
      setComments((prev) => {
        const next = prev.map((comment: any) =>
          comment.id === parentId
            ? {
              ...comment,
              replies: (comment.replies || []).filter((reply: any) => reply.id !== replyId)
            }
            : comment
        );
        resolve(next);
        return prev;
      });
    });
    await saveComments(updatedComments);
  }, [saveComments]);

  const updateComment = useCallback(async (commentId: string | number, updates: any) => {
    const updatedComments = await new Promise<any[]>((resolve) => {
      setComments((prev) => {
        const next = prev.map((comment: any) =>
          comment.id === commentId
            ? { ...comment, ...updates, updatedAt: new Date().toISOString() }
            : comment
        );
        resolve(next);
        return prev;
      });
    });
    await saveComments(updatedComments);
  }, [saveComments]);

  const updateReply = useCallback(async (parentId: string | number, replyId: string | number, updates: any) => {
    const updatedComments = await new Promise<any[]>((resolve) => {
      setComments((prev) => {
        const next = prev.map((comment: any) =>
          comment.id === parentId
            ? {
              ...comment,
              replies: (comment.replies || []).map((reply: any) =>
                reply.id === replyId
                  ? { ...reply, ...updates, updatedAt: new Date().toISOString() }
                  : reply
              )
            }
            : comment
        );
        resolve(next);
        return prev;
      });
    });
    await saveComments(updatedComments);
  }, [saveComments]);

  const getTotalCommentCount = useCallback(() => {
    return comments.reduce((total: number, comment: any) => {
      return total + 1 + (comment.replies?.length || 0);
    }, 0);
  }, [comments]);

  const getCommentsAtTime = useCallback((timeInSeconds: number, tolerance = 5) => {
    const result: any[] = [];

    comments.forEach((comment: any) => {
      if (Math.abs(comment.timeInSeconds - timeInSeconds) <= tolerance) {
        result.push({ ...comment, type: 'comment' });
      }

      (comment.replies || []).forEach((reply: any) => {
        if (Math.abs(reply.timeInSeconds - timeInSeconds) <= tolerance) {
          result.push({ ...reply, type: 'reply', parentId: comment.id });
        }
      });
    });

    return result.sort((a, b) => a.timeInSeconds - b.timeInSeconds);
  }, [comments]);

  useEffect(() => {
    isCancelledRef.current = false;
    loadComments();
    return () => {
      isCancelledRef.current = true;
    };
  }, [loadComments]);

  return {
    comments,
    loading,
    saving,
    error,
    addComment,
    addReply,
    deleteComment,
    deleteReply,
    updateComment,
    updateNotes,
    updateReply,
    refreshComments: loadComments,
    getTotalCommentCount,
    getCommentsAtTime,
  };
};
