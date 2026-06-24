/**
 * Comments Hook
 * 
 * Custom React hook for managing comments on workflow stages.
 * 
 * @author Juan
 * @version 1.0
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  text: string;
  author: string;
  authorRole: string;
  timestamp: string;
  isEdited: boolean;
}

interface UseCommentsReturn {
  comments: { [stageId: string]: Comment[] };
  addComment: (stageId: string, commentText: string) => void;
  editComment: (commentId: string, newText: string) => void;
  deleteComment: (commentId: string) => void;
  getCommentsForStage: (stageId: string) => Comment[];
}

/**
 * Custom hook for managing comments
 * 
 * @returns Comments hook interface
 */
export function useComments(): UseCommentsReturn {
  const [comments, setComments] = useState<{ [stageId: string]: Comment[] }>({});

  const addComment = useCallback((stageId: string, commentText: string) => {
    const newComment: Comment = {
      id: `${stageId}-comment-${Date.now()}`,
      text: commentText,
      author: 'Current User',
      authorRole: 'Project Manager',
      timestamp: new Date().toISOString(),
      isEdited: false
    };

    setComments(prev => ({
      ...prev,
      [stageId]: [...(prev[stageId] || []), newComment]
    }));

    toast.success('Comment added successfully.');
  }, []);

  const editComment = useCallback((commentId: string, newText: string) => {
    setComments(prev => {
      const newComments = { ...prev };
      
      Object.keys(newComments).forEach(stageId => {
        newComments[stageId] = newComments[stageId].map(comment =>
          comment.id === commentId
            ? { ...comment, text: newText, isEdited: true }
            : comment
        );
      });
      
      return newComments;
    });

    toast.success('Comment updated successfully.');
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    setComments(prev => {
      const newComments = { ...prev };
      
      Object.keys(newComments).forEach(stageId => {
        newComments[stageId] = newComments[stageId].filter(
          comment => comment.id !== commentId
        );
      });
      
      return newComments;
    });

    toast.success('Comment deleted successfully.');
  }, []);

  const getCommentsForStage = useCallback((stageId: string): Comment[] => {
    return comments[stageId] || [];
  }, [comments]);

  return {
    comments,
    addComment,
    editComment,
    deleteComment,
    getCommentsForStage
  };
}

