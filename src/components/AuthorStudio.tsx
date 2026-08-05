'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface AuthorStudioProps {
  newTopic: any;
  setNewTopic: (t: any) => void;
  handleCreateTopic: (e: React.FormEvent) => void;
  authorMsg: string | null;
  topics: any[];
}

export const AuthorStudio: React.FC<AuthorStudioProps> = ({
  newTopic,
  setNewTopic,
  handleCreateTopic,
  authorMsg,
  topics,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Author Studio & Clinical Code Mapper
          </h2>
          <p className="text-xs text-slate-500">
            Author topics with SNOMED-CT/ICD coding publish-gate validation.
          </p>
        </div>

        <form onSubmit={handleCreateTopic} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Author & Code New Topic</h3>
          
          {authorMsg && (
            <div className={`p-3 rounded text-xs font-semibold ${
              authorMsg.includes('Failure') ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              {authorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Topic Code:</label>
              <input
                type="text"
                value={newTopic.code}
                onChange={(e) => setNewTopic({ ...newTopic, code: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 bg-white"
                required
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Topic Title:</label>
              <input
                type="text"
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 bg-white"
                required
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">SNOMED-CT Code (Mandatory Publish Gate):</label>
              <input
                type="text"
                value={newTopic.snomedCode}
                onChange={(e) => setNewTopic({ ...newTopic, snomedCode: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 bg-white"
                placeholder="e.g. 173874004"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">ICD-10 Code:</label>
              <input
                type="text"
                value={newTopic.icdCode}
                onChange={(e) => setNewTopic({ ...newTopic, icdCode: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 bg-white"
                placeholder="e.g. J32.9"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded text-xs"
          >
            Run Publish-Gate & Save Topic
          </button>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Existing Topic Graph & Publish Validation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {topics.map((t) => (
              <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{t.title}</span>
                  {t.isValidForPublish ? (
                    <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                      Publish Gate Passed
                    </span>
                  ) : (
                    <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                      Gate Failed
                    </span>
                  )}
                </div>
                <p className="text-slate-500">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
