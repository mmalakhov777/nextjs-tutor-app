import { Agent } from '@/app/agents/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FiEdit2, FiTrash2, FiTool } from '@/utils/optimizedIcons';
import { formatDistanceToNow } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { Settings, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";

interface AgentListProps {
  agents: Agent[];
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  isDeleting?: string;  // ID of agent being deleted
  editableAgentType?: 'custom';  // Change to enum type for better type safety
}

export default function AgentList({ agents, onEdit, onDelete, isDeleting, editableAgentType }: AgentListProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.id} className={isDeleting === agent.id ? 'opacity-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {agent.name}
                {agent.is_triage_agent && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Triage
                  </Badge>
                )}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                Model: {agent.model}
              </div>
            </div>
            <div className="flex space-x-2">
              {editableAgentType === 'custom' && agent.is_custom_template && (
                <Button
                  onClick={() => onEdit(agent)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {agent.can_disable && (
                <Button
                  onClick={() => onDelete(agent)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isDeleting === agent.id}
                >
                  {isDeleting === agent.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="line-clamp-2 text-muted-foreground text-xs">
                  {agent.instructions}
                </p>
              </div>
              
              {agent.tools && agent.tools.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    <FiTool className="h-3 w-3" />
                    <span>Tools</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      agent.enabled ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span>{agent.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                {agent.created_at && (
                  <span className="text-muted-foreground">
                    Created {formatDistanceToNow(new Date(agent.created_at))} ago
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 