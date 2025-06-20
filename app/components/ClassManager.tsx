'use client';

import { useState, useEffect } from 'react';
import { ClassDetails } from '../lib/types';
import { createClass, getClasses, deleteClass } from '../lib/firebase-service';
import { Button } from './ui/Button';

interface ClassManagerProps {
  selectedClass: ClassDetails | null;
  onClassSelect: (classDetails: ClassDetails | null) => void;
}

export default function ClassManager({ selectedClass, onClassSelect }: ClassManagerProps) {
  const [classes, setClasses] = useState<ClassDetails[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    className: '',
    subject: '',
    teacher: '',
    description: '',
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      const loadedClasses = await getClasses();
      setClasses(loadedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.className || !formData.subject || !formData.teacher) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const newClass = await createClass({
        className: formData.className,
        subject: formData.subject,
        teacher: formData.teacher,
        description: formData.description,
      });

      setClasses(prev => [newClass, ...prev]);
      setFormData({ className: '', subject: '', teacher: '', description: '' });
      setShowCreateForm(false);
      setError(null);

      // Auto-select the new class
      onClassSelect(newClass);
    } catch (error) {
      console.error('Error creating class:', error);
      setError('Failed to create class');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteClass(classId);
      setClasses(prev => prev.filter(c => c.id !== classId));
      
      if (selectedClass?.id === classId) {
        onClassSelect(null);
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      setError('Failed to delete class');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-300 rounded"></div>
            <div className="h-16 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Class Management</h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          size="sm"
        >
          {showCreateForm ? 'Cancel' : 'Create New Class'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Create Class Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateClass} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Create New Class</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Name *
              </label>
              <input
                type="text"
                value={formData.className}
                onChange={(e) => setFormData(prev => ({ ...prev, className: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Grade 10A, CS101"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Mathematics, Computer Science"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher Name *
              </label>
              <input
                type="text"
                value={formData.teacher}
                onChange={(e) => setFormData(prev => ({ ...prev, teacher: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Dr. Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Class
            </Button>
          </div>
        </form>
      )}

      {/* Classes List */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Select a Class:</h3>
        
        {classes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p>No classes created yet</p>
            <p className="text-sm">Create your first class to get started</p>
          </div>
        ) : (
          classes.map((classItem) => (
            <div
              key={classItem.id}
              className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                selectedClass?.id === classItem.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onClassSelect(classItem)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{classItem.className}</h4>
                    {selectedClass?.id === classItem.id && (
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Subject:</span> {classItem.subject}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Teacher:</span> {classItem.teacher}
                  </div>
                  {classItem.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {classItem.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    Created: {classItem.createdAt.toLocaleDateString()}
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(classItem.id);
                  }}
                  className="ml-2 p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Delete class"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 