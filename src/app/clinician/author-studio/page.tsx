'use client';

import { AuthorStudio } from '@/components/AuthorStudio';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function AuthorStudioPage() {
  const { newTopic, setNewTopic, handleCreateTopic, authorMsg, topics } = useAppData();
  return (
    <ClinicalErrorBoundary componentName="AuthorStudio">
      <AuthorStudio
        newTopic={newTopic}
        setNewTopic={setNewTopic}
        handleCreateTopic={handleCreateTopic}
        authorMsg={authorMsg}
        topics={topics}
      />
    </ClinicalErrorBoundary>
  );
}
