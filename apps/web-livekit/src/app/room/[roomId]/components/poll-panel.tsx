"use client";

import { useState, useEffect } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    <Card className="flex h-80 flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Polls & Quizzes</CardTitle>
          {isInstructor && (
            <Button
              onClick={() => setShowCreateForm(true)}
              size="sm"
            >
              + New Poll
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 p-0">
        <div className="px-4 py-3 space-y-4">
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
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Closed Polls</h4>
              {closedPolls.map((poll) => (
                <PollResultsCard key={poll.id} poll={poll} />
              ))}
            </div>
          )}

          {polls.length === 0 && !showCreateForm && (
            <p className="text-sm text-gray-500 text-center py-4">
              {isInstructor
                ? "Create a poll to engage your students"
                : "No active polls"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="p-4 space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question..."
            required
          />
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <Input
                key={idx}
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[idx] = e.target.value;
                  setOptions(newOptions);
                }}
                placeholder={`Option ${idx + 1}`}
              />
            ))}
            {options.length < 6 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOptions([...options, ""])}
              >
                + Add option
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Create Poll
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm flex-1">{poll.question}</CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClose(poll.id)}
              className="text-xs text-red-600 hover:text-red-700 h-auto p-0"
            >
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {poll.options.map((option) => {
          const isSelected = currentVote === option.id;
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;

          return (
            <Button
              key={option.id}
              onClick={() => !currentVote && onVote(poll.id, option.id)}
              disabled={!!currentVote}
              variant={isSelected ? "default" : currentVote ? "outline" : "outline"}
              className={`w-full text-left justify-start h-auto py-2 ${isSelected
                  ? "bg-blue-100 border-2 border-blue-500 text-blue-700"
                  : ""
                }`}
            >
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className={isSelected ? "font-medium" : ""}>
                    {option.text}
                  </span>
                  {currentVote && (
                    <Badge variant="secondary" className="text-xs">
                      {option.votes} votes ({percentage.toFixed(0)}%)
                    </Badge>
                  )}
                </div>
                {currentVote && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}
              </div>
            </Button>
          );
        })}
      </CardContent>
      {currentVote && (
        <CardDescription className="px-6 pb-4 text-xs">
          Total votes: {totalVotes}
        </CardDescription>
      )}
    </Card>
  );
}

function PollResultsCard({ poll }: { poll: Poll }) {
  const totalVotes = Object.keys(poll.responses).length;
  const maxVotes = Math.max(...poll.options.map((opt) => opt.votes), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs">{poll.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          return (
            <div key={option.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{option.text}</span>
                <Badge variant="secondary" className="text-xs">
                  {option.votes} ({percentage.toFixed(0)}%)
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
      <CardDescription className="px-6 pb-4 text-xs">
        Total: {totalVotes} votes
      </CardDescription>
    </Card>
  );
}
