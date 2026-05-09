'use client';

import { useState, useCallback } from 'react';
import { TaskType, PIC, Priority, PRIORITIES } from '@/lib/types';
import { validateTaskTitle } from '@/lib/validation';
import { safeHexColor } from '@/lib/security';

export interface CreateTaskData {
  title: string;
  description: string | null;
  priority: Priority;
  type_id: string | null;
  deadline: string | null;
  pic_id: string | null;
}

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskData) => Promise<void>;
  types: TaskType[];
  pics: PIC[];
}

interface FormData {
  title: string;
  description: string;
  priority: Priority;
  type_id: string | null;
  deadline: string;
  pic_id: string | null;
}

const STEP_TITLES = [
  'Name the Quest',
  'Choose the Guild',
  'Set Deadline',
  'Assign Party Member',
  'Review & Create',
];

const PRIORITY_LABELS: Record<Priority, string> = {
  normal: 'Normal',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  normal: 'border-rpg-normal text-rpg-normal',
  rare: 'border-rpg-rare text-rpg-rare',
  epic: 'border-rpg-epic text-rpg-epic',
  legendary: 'border-rpg-legendary text-rpg-legendary',
};

function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function WizardModal({ isOpen, onClose, onSubmit, types, pics }: WizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priority: 'normal',
    type_id: null,
    deadline: '',
    pic_id: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setFormData({
      title: '',
      description: '',
      priority: 'normal',
      type_id: null,
      deadline: '',
      pic_id: null,
    });
    setIsSubmitting(false);
    setError(null);
  }, []);

  const handleDismiss = () => {
    resetForm();
    onClose();
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return validateTaskTitle(formData.title).valid;
      case 2:
      case 3:
      case 4:
        return true; // Optional steps are always valid
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && isStepValid(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        type_id: formData.type_id,
        deadline: formData.deadline || null,
        pic_id: formData.pic_id,
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quest. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const titleValidation = validateTaskTitle(formData.title);
  const selectedType = types.find((t) => t.id === formData.type_id);
  const selectedPic = pics.find((p) => p.id === formData.pic_id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Create Quest Wizard"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rpg-card p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-pixel text-rpg-legendary">
            {STEP_TITLES[currentStep - 1]}
          </h2>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white font-pixel text-xs"
            aria-label="Close wizard"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 ${
                step <= currentStep ? 'bg-rpg-legendary' : 'bg-rpg-border'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[200px]">
          {currentStep === 1 && (
            <Step1
              formData={formData}
              setFormData={setFormData}
              titleValidation={titleValidation}
            />
          )}
          {currentStep === 2 && (
            <Step2
              formData={formData}
              setFormData={setFormData}
              types={types}
            />
          )}
          {currentStep === 3 && (
            <Step3
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {currentStep === 4 && (
            <Step4
              formData={formData}
              setFormData={setFormData}
              pics={pics}
            />
          )}
          {currentStep === 5 && (
            <Step5
              formData={formData}
              selectedType={selectedType}
              selectedPic={selectedPic}
              error={error}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-rpg-border">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2 font-retro text-sm text-gray-300 hover:text-white pixel-border hover:border-rpg-rare transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
            )}
          </div>
          <div>
            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
                className="px-4 py-2 font-retro text-sm bg-rpg-rare text-white pixel-border border-rpg-rare hover:shadow-rare transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 font-retro text-sm bg-rpg-legendary text-rpg-dark pixel-border border-rpg-legendary hover:shadow-legendary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : '⚔ Create Quest'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Step Components
   ============================================================ */

interface StepProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

function Step1({
  formData,
  setFormData,
  titleValidation,
}: StepProps & { titleValidation: { valid: boolean; error?: string } }) {
  const showTitleError = formData.title.length > 0 && !titleValidation.valid;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs mb-2 text-rpg-rare">Quest Name *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Enter quest title (3-100 chars)"
          maxLength={100}
          className="w-full bg-rpg-dark text-white font-retro text-sm px-3 py-2 pixel-border focus:outline-none focus:shadow-rare"
          aria-label="Quest title"
          aria-invalid={showTitleError}
        />
        {showTitleError && (
          <p className="mt-1 text-xs font-retro text-red-400">{titleValidation.error}</p>
        )}
        <p className="mt-1 text-xs font-retro text-gray-500">
          {formData.title.trim().length}/100 characters
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs mb-2 text-rpg-rare">Description (optional)</label>
        <textarea
          value={formData.description}
          onChange={(e) => {
            if (e.target.value.length <= 500) {
              setFormData((prev) => ({ ...prev, description: e.target.value }));
            }
          }}
          placeholder="Describe the quest..."
          rows={3}
          maxLength={500}
          className="w-full bg-rpg-dark text-white font-retro text-sm px-3 py-2 pixel-border focus:outline-none focus:shadow-rare resize-none"
          aria-label="Quest description"
        />
        <p className="mt-1 text-xs font-retro text-gray-500">
          {formData.description.length}/500 characters
        </p>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-xs mb-2 text-rpg-rare">Rarity Tier</label>
        <div className="grid grid-cols-2 gap-2">
          {PRIORITIES.map((priority) => (
            <button
              key={priority}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, priority }))}
              className={`px-3 py-2 font-retro text-sm pixel-border transition-all ${
                formData.priority === priority
                  ? `${PRIORITY_COLORS[priority]} border-current shadow-${priority}`
                  : 'text-gray-400 border-rpg-border hover:text-white'
              }`}
              aria-pressed={formData.priority === priority}
            >
              {PRIORITY_LABELS[priority]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({ formData, setFormData, types }: StepProps & { types: TaskType[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-retro text-gray-400 mb-4">
        Select a guild for this quest (optional — you can skip this step).
      </p>

      {types.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-retro text-gray-500">No guilds available.</p>
          <p className="text-xs font-retro text-gray-600 mt-1">
            Create types in Master → Types first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
          {/* None option */}
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, type_id: null }))}
            className={`flex items-center gap-3 px-3 py-2 font-retro text-sm pixel-border transition-all text-left ${
              formData.type_id === null
                ? 'border-rpg-rare text-rpg-rare shadow-rare'
                : 'border-rpg-border text-gray-400 hover:text-white'
            }`}
            aria-pressed={formData.type_id === null}
          >
            <span>—</span>
            <span>No Guild</span>
          </button>

          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, type_id: type.id }))}
              className={`flex items-center gap-3 px-3 py-2 font-retro text-sm pixel-border transition-all text-left ${
                formData.type_id === type.id
                  ? 'border-rpg-rare text-rpg-rare shadow-rare'
                  : 'border-rpg-border text-gray-400 hover:text-white'
              }`}
              aria-pressed={formData.type_id === type.id}
            >
              <span className="text-lg">{type.icon}</span>
              <span>{type.name}</span>
              <span
                className="ml-auto w-3 h-3 rounded-full"
                style={{ backgroundColor: safeHexColor(type.color) }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Step3({ formData, setFormData }: StepProps) {
  const todayStr = getTodayString();

  return (
    <div className="space-y-4">
      <p className="text-sm font-retro text-gray-400 mb-4">
        Set a deadline for this quest (optional — you can skip this step).
      </p>

      <div>
        <label className="block text-xs mb-2 text-rpg-rare">Deadline</label>
        <input
          type="date"
          value={formData.deadline}
          min={todayStr}
          onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
          className="w-full bg-rpg-dark text-white font-retro text-sm px-3 py-2 pixel-border focus:outline-none focus:shadow-rare"
          aria-label="Quest deadline"
        />
      </div>

      {formData.deadline && (
        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, deadline: '' }))}
          className="text-xs font-retro text-gray-400 hover:text-red-400 transition-colors"
        >
          ✕ Clear deadline
        </button>
      )}
    </div>
  );
}

function Step4({ formData, setFormData, pics }: StepProps & { pics: PIC[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-retro text-gray-400 mb-4">
        Assign a party member to this quest (optional — you can skip this step).
      </p>

      {pics.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-retro text-gray-500">No party members available.</p>
          <p className="text-xs font-retro text-gray-600 mt-1">
            Create PICs in Master → PICs first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
          {/* None option */}
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, pic_id: null }))}
            className={`flex items-center gap-3 px-3 py-2 font-retro text-sm pixel-border transition-all text-left ${
              formData.pic_id === null
                ? 'border-rpg-rare text-rpg-rare shadow-rare'
                : 'border-rpg-border text-gray-400 hover:text-white'
            }`}
            aria-pressed={formData.pic_id === null}
          >
            <span>—</span>
            <span>No Party Member</span>
          </button>

          {pics.map((pic) => (
            <button
              key={pic.id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, pic_id: pic.id }))}
              className={`flex items-center gap-3 px-3 py-2 font-retro text-sm pixel-border transition-all text-left ${
                formData.pic_id === pic.id
                  ? 'border-rpg-rare text-rpg-rare shadow-rare'
                  : 'border-rpg-border text-gray-400 hover:text-white'
              }`}
              aria-pressed={formData.pic_id === pic.id}
            >
              <span className="text-lg">{pic.avatar}</span>
              <div>
                <span className="block">{pic.name}</span>
                <span className="text-xs text-gray-500">{pic.rpg_class}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Step5({
  formData,
  selectedType,
  selectedPic,
  error,
}: {
  formData: FormData;
  selectedType: TaskType | undefined;
  selectedPic: PIC | undefined;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-retro text-gray-400 mb-4">
        Review your quest details before creating.
      </p>

      <div className="space-y-3">
        {/* Title */}
        <div className="pixel-border p-3">
          <span className="text-xs font-pixel text-rpg-rare block mb-1">Quest Name</span>
          <span className="font-retro text-sm text-white">{formData.title.trim()}</span>
        </div>

        {/* Description */}
        {formData.description.trim() && (
          <div className="pixel-border p-3">
            <span className="text-xs font-pixel text-rpg-rare block mb-1">Description</span>
            <span className="font-retro text-sm text-gray-300">{formData.description.trim()}</span>
          </div>
        )}

        {/* Priority */}
        <div className="pixel-border p-3">
          <span className="text-xs font-pixel text-rpg-rare block mb-1">Rarity</span>
          <span className={`font-retro text-sm ${PRIORITY_COLORS[formData.priority]}`}>
            {PRIORITY_LABELS[formData.priority]}
          </span>
        </div>

        {/* Type */}
        <div className="pixel-border p-3">
          <span className="text-xs font-pixel text-rpg-rare block mb-1">Guild</span>
          <span className="font-retro text-sm text-gray-300">
            {selectedType ? `${selectedType.icon} ${selectedType.name}` : 'None'}
          </span>
        </div>

        {/* Deadline */}
        <div className="pixel-border p-3">
          <span className="text-xs font-pixel text-rpg-rare block mb-1">Deadline</span>
          <span className="font-retro text-sm text-gray-300">
            {formData.deadline || 'No deadline'}
          </span>
        </div>

        {/* PIC */}
        <div className="pixel-border p-3">
          <span className="text-xs font-pixel text-rpg-rare block mb-1">Party Member</span>
          <span className="font-retro text-sm text-gray-300">
            {selectedPic ? `${selectedPic.avatar} ${selectedPic.name} (${selectedPic.rpg_class})` : 'None'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="pixel-border border-red-500 p-3 mt-4">
          <p className="font-retro text-sm text-red-400">⚠ {error}</p>
        </div>
      )}
    </div>
  );
}
