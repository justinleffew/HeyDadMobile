import { useEffect, useState } from "react";
import { supabase } from "utils/supabase";

export const useVideoComments = (videoId: string) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadComments = async () => {
    if (!videoId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('video_comments')
        .select('comments_data')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setComments(data?.comments_data || []);
    } catch (err) {
      setError(`Failed to load comments: ${err.message}`);
      console.error('Error loading comments:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const updateNotes = async (notes: string) => {
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error } = await supabase
        .from('videos')
        .update({ notes })
        .eq('id', videoId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      setError(`Failed to save notes: ${err.message}`);
      console.error('Error saving notes:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveComments = async (newCommentsData: CommentData) => {
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error } = await supabase
        .from('video_comments')
        .upsert({
          video_id: videoId,
          comments_data: newCommentsData
        }, {
          onConflict: 'video_id'
        })
        .select();

      if (error) throw error;

      setComments(newCommentsData);
      return data;
    } catch (err) {
      setError(`Failed to save comments: ${err.message}`);
      console.error('Error saving comments:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };


  type CommentData = {
    content: string;
    author: string;
    author_id: string;
    timestamp: string;
    timeInSeconds: number;
  };

  const addComment = async (commentData: CommentData) => {
    if (!commentData.content?.trim()) {
      throw new Error('Comment content is required');
    }

    const newComment = {
      id: Date.now(),
      author: commentData.author || 'Anonymous',
      author_id: commentData.author_id || null,
      content: commentData.content.trim(),
      timestamp: commentData.timestamp || '0:00',
      timeInSeconds: commentData.timeInSeconds || 0,
      createdAt: new Date().toISOString(),
      replies: []
    };

    const updatedComments = [...comments, newComment];
    await saveComments(updatedComments);
    return newComment;
  };

  const addReply = async (parentId, replyData) => {
    if (!replyData.content?.trim()) {
      throw new Error('Reply content is required');
    }

    const newReply = {
      id: Date.now() + Math.random(),
      author: replyData.author || 'Anonymous',
      author_id: replyData.author_id || null,
      content: replyData.content.trim(),
      timestamp: replyData.timestamp || '0:00',
      timeInSeconds: replyData.timeInSeconds || 0,
      createdAt: new Date().toISOString(),
      parentId
    };

    const updatedComments = comments.map(comment =>
      comment.id === parentId
        ? { ...comment, replies: [...(comment.replies || []), newReply] }
        : comment
    );

    await saveComments(updatedComments);
    return newReply;
  };


  const deleteComment = async (commentId) => {
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    await saveComments(updatedComments);
  };

  const deleteReply = async (parentId, replyId) => {
    const updatedComments = comments.map(comment =>
      comment.id === parentId
        ? {
          ...comment,
          replies: (comment.replies || []).filter(reply => reply.id !== replyId)
        }
        : comment
    );
    await saveComments(updatedComments);
  };

  const updateComment = async (commentId, updates) => {
    const updatedComments = comments.map(comment =>
      comment.id === commentId
        ? { ...comment, ...updates, updatedAt: new Date().toISOString() }
        : comment
    );
    await saveComments(updatedComments);
  };

  const updateReply = async (parentId, replyId, updates) => {
    const updatedComments = comments.map(comment =>
      comment.id === parentId
        ? {
          ...comment,
          replies: (comment.replies || []).map(reply =>
            reply.id === replyId
              ? { ...reply, ...updates, updatedAt: new Date().toISOString() }
              : reply
          )
        }
        : comment
    );
    await saveComments(updatedComments);
  };

  const getTotalCommentCount = () => {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.replies?.length || 0);
    }, 0);
  };

  const getCommentsAtTime = (timeInSeconds: number, tolerance = 5) => {
    const result = [];

    comments.forEach(comment => {
      if (Math.abs(comment.timeInSeconds - timeInSeconds) <= tolerance) {
        result.push({ ...comment, type: 'comment' });
      }

      (comment.replies || []).forEach(reply => {
        if (Math.abs(reply.timeInSeconds - timeInSeconds) <= tolerance) {
          result.push({ ...reply, type: 'reply', parentId: comment.id });
        }
      });
    });

    return result.sort((a, b) => a.timeInSeconds - b.timeInSeconds);
  };

  useEffect(() => {
    loadComments();
  }, [videoId]);

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
