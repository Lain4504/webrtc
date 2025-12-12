"use client";

import { useState, useEffect } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creator: string;
  createdAt: number;
  isActive: boolean;
  responses: Record<string, string>; // participant identity -> option id
}

interface PollMessage {
  type: "create" | "vote" | "close" | "results";
  poll?: Poll;
  pollId?: string;
  optionId?: string;
  participantIdentity?: string;
}

export default function PollPanel() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);

  useEffect(() => {
    if (!localParticipant) return;
    try {
      const metadata = localParticipant.metadata
        ? JSON.parse(localParticipant.metadata)
        : {};
      setIsInstructor(metadata.role === "instructor");
    } catch {
      setIsInstructor(false);
    }
  }, [localParticipant]);

  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();
    const handler = (
      payload: Uint8Array,
      participant: { identity: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "poll") return;
      if (!participant || participant.identity === room.localParticipant?.identity) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as PollMessage;

        if (message.type === "create" && message.poll) {
          setPolls((prev) => [...prev, message.poll!]);
        } else if (message.type === "vote" && message.pollId && message.optionId) {
          setPolls((prev) =>
            prev.map((poll) => {
              if (poll.id === message.pollId) {
                const newResponses = {
                  ...poll.responses,
                  [message.participantIdentity || ""]: message.optionId!,
                };
                const newOptions = poll.options.map((opt) => ({
                  ...opt,
                  votes: Object.values(newResponses).filter((id) => id === opt.id).length,
                }));
                return { ...poll, options: newOptions, responses: newResponses };
              }
              return poll;
            }),
          );
        } else if (message.type === "close" && message.pollId) {
          setPolls((prev) =>
            prev.map((poll) =>
              poll.id === message.pollId ? { ...poll, isActive: false } : poll,
            ),
          );
        }
      } catch (error) {
        console.warn("Failed to parse poll message", error);
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const sendPollMessage = async (message: PollMessage) => {
    if (!room || !localParticipant) return;
    const encoder = new TextEncoder();
    await localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
      reliable: true,
      topic: "poll",
    });
  };

  const createPoll = async (question: string, options: string[]) => {
    if (!room || !localParticipant) return;

    const poll: Poll = {
      id: crypto.randomUUID(),
      question,
      options: options.map((text, idx) => ({
        id: `opt-${idx}`,
        text,
        votes: 0,
      })),
      creator: localParticipant.identity,
      createdAt: Date.now(),
      isActive: true,
      responses: {},
    };

    await sendPollMessage({ type: "create", poll });
    setPolls((prev) => [...prev, poll]);
    setShowCreateForm(false);
  };

  const votePoll = async (pollId: string, optionId: string) => {
    await sendPollMessage({
      type: "vote",
      pollId,
      optionId,
      participantIdentity: localParticipant?.identity,
    });
  };

  const closePoll = async (pollId: string) => {
    await sendPollMessage({ type: "close", pollId });
  };

  const activePolls = polls.filter((p) => p.isActive);
  const closedPolls = polls.filter((p) => !p.isActive);

  return (
    <div className="flex h-80 flex-col border-b border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-white">Polls & Quizzes</h3>
        {isInstructor && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
          >
            + New Poll
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {showCreateForm && (
          <CreatePollForm
            onCreate={createPoll}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {activePolls.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            onVote={votePoll}
            onClose={isInstructor ? closePoll : undefined}
            currentVote={poll.responses[localParticipant?.identity || ""]}
          />
        ))}

        {closedPolls.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Closed Polls</h4>
            {closedPolls.map((poll) => (
              <PollResultsCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}

        {polls.length === 0 && !showCreateForm && (
          <p className="text-sm text-slate-500 text-center py-4">
            {isInstructor
              ? "Create a poll to engage your students"
              : "No active polls"}
          </p>
        )}
      </div>
    </div>
  );
}

function CreatePollForm({
  onCreate,
  onCancel,
}: {
  onCreate: (question: string, options: string[]) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((opt) => opt.trim());
    if (question.trim() && validOptions.length >= 2) {
      onCreate(question.trim(), validOptions);
      setQuestion("");
      setOptions(["", ""]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-lg p-4 space-y-3">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter your question..."
        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
        required
      />
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <input
            key={idx}
            type="text"
            value={opt}
            onChange={(e) => {
              const newOptions = [...options];
              newOptions[idx] = e.target.value;
              setOptions(newOptions);
            }}
            placeholder={`Option ${idx + 1}`}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          />
        ))}
        {options.length < 6 && (
          <button
            type="button"
            onClick={() => setOptions([...options, ""])}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            + Add option
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Create Poll
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function PollCard({
  poll,
  onVote,
  onClose,
  currentVote,
}: {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  onClose?: (pollId: string) => void;
  currentVote?: string;
}) {
  const totalVotes = Object.keys(poll.responses).length;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-semibold text-white flex-1">{poll.question}</h4>
        {onClose && (
          <button
            onClick={() => onClose(poll.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Close
          </button>
        )}
      </div>
      <div className="space-y-2">
        {poll.options.map((option) => {
          const isSelected = currentVote === option.id;
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;

          return (
            <button
              key={option.id}
              onClick={() => !currentVote && onVote(poll.id, option.id)}
              disabled={!!currentVote}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${isSelected
                  ? "bg-blue-500/20 border-2 border-blue-500"
                  : currentVote
                    ? "bg-slate-700/50 border border-slate-600"
                    : "bg-slate-700 border border-slate-600 hover:bg-slate-600"
                }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={isSelected ? "text-blue-300 font-medium" : "text-slate-200"}>
                  {option.text}
                </span>
                {currentVote && (
                  <span className="text-xs text-slate-400">
                    {option.votes} votes ({percentage.toFixed(0)}%)
                  </span>
                )}
              </div>
              {currentVote && (
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {currentVote && (
        <p className="text-xs text-slate-400">Total votes: {totalVotes}</p>
      )}
    </div>
  );
}

function PollResultsCard({ poll }: { poll: Poll }) {
  const totalVotes = Object.keys(poll.responses).length;
  const maxVotes = Math.max(...poll.options.map((opt) => opt.votes), 0);

  return (
    <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
      <h4 className="text-xs font-semibold text-slate-300">{poll.question}</h4>
      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          return (
            <div key={option.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{option.text}</span>
                <span className="text-slate-500">
                  {option.votes} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Total: {totalVotes} votes</p>
    </div>
  );
}
