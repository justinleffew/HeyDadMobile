import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "utils/supabase";

export type NarrationComment = {
  id: string;
  author: string;
  author_id: string | null;
  content: string;
  createdAt: string;
};

export const useNarrationComments = (narrationId: string) => {
  const [comments, setComments] = useState<NarrationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCancelledRef = useRef(false);

  const loadComments = useCallback(async () => {
    if (!narrationId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('narration_comments')
        .select('comments_data')
        .eq('narration_id', narrationId)
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
  }, [narrationId]);

  const saveComments = useCallback(async (newCommentsData: NarrationComment[]) => {
    if (!narrationId) {
      throw new Error('Narration ID is required');
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error: saveError } = await supabase
        .from('narration_comments')
        .upsert({
          narration_id: narrationId,
          comments_data: newCommentsData,
        }, {
          onConflict: 'narration_id',
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
  }, [narrationId]);

  const addComment = useCallback(async (commentData: { content: string; author: string; author_id: string | null }) => {
    if (!commentData.content?.trim()) {
      throw new Error('Comment content is required');
    }

    const newComment: NarrationComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      author: commentData.author || 'Dad',
      author_id: commentData.author_id || null,
      content: commentData.content.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = await new Promise<NarrationComment[]>((resolve) => {
      setComments((prev) => {
        const next = [...prev, newComment];
        resolve(next);
        return prev;
      });
    });

    await saveComments(updatedComments);
    return newComment;
  }, [saveComments]);

  const deleteComment = useCallback(async (commentId: string) => {
    const updatedComments = await new Promise<NarrationComment[]>((resolve) => {
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== commentId);
        resolve(next);
        return prev;
      });
    });
    await saveComments(updatedComments);
  }, [saveComments]);

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
    deleteComment,
    refreshComments: loadComments,
  };
};
