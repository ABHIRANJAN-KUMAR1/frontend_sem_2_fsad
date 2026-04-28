import { useEffect } from "react";
import { usersApi } from "@/lib/api";
import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { useActivities } from "@/context/ActivityContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ArrowRightLeft, Users, BookOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Activity } from "@/types";
import { getJson, type LocalUserPreview } from "@/lib/safeStorage";
import { isValid, parseISO } from "date-fns";

const participantsOf = (a: Activity) => a.currentParticipants ?? [];
const maxCapOf = (a: Activity) => Math.max(Number(a.maxParticipants) || 0, 0);

export default function AdminRedirect() {
  const { activities, updateActivity } = useActivities();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isRedirectDialogOpen, setIsRedirectDialogOpen] = useState(false);
  const [targetActivityId, setTargetActivityId] = useState<string>("");
  const [sourceActivityId, setSourceActivityId] = useState<string>("");

  //const allStudentsRaw = getJson<LocalUserPreview[]>("users", []);
  const [allStudents, setAllStudents] = useState<any[]>([]);

useEffect(() => {
  const fetchStudents = async () => {
    try {
      const data = await usersApi.getStudents();
      setAllStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchStudents();
}, []);

  
  //const allStudents: { id: string; name: string; email: string }[] = allStudentsRaw.filter((user) => user.role === "student");

  const activitiesWithRegistrations = activities.filter(
    (activity) => participantsOf(activity).length > 0,
  );

  const studentRegistrations = new Map<string, Activity[]>();
  activitiesWithRegistrations.forEach((activity) => {
    participantsOf(activity).forEach((studentId) => {
      const existing = studentRegistrations.get(studentId) || [];
      studentRegistrations.set(studentId, [...existing, activity]);
    });
  });

  const filteredStudents = allStudents.filter(
    (student) =>
      (student.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getAvailableActivities = (excludeId: string) => {
    return activities.filter(
      (a) => a.id !== excludeId && participantsOf(a).length < maxCapOf(a),
    );
  };

  const handleRedirect = () => {
    if (!selectedStudent || !sourceActivityId || !targetActivityId) {
      toast.error("Please select all required fields");
      return;
    }

    if (sourceActivityId === targetActivityId) {
      toast.error("Source and target activities must be different");
      return;
    }

    const sourceActivity = activities.find((a) => a.id === sourceActivityId);
    const targetActivity = activities.find((a) => a.id === targetActivityId);

    if (!sourceActivity || !targetActivity) {
      toast.error("Activities not found");
      return;
    }

    if (participantsOf(targetActivity).length >= maxCapOf(targetActivity)) {
      toast.error("Target activity is full");
      return;
    }

    const updatedSourceActivity = {
      ...sourceActivity,
      currentParticipants: participantsOf(sourceActivity).filter((id) => id !== selectedStudent),
    };

    const updatedTargetActivity = {
      ...targetActivity,
      currentParticipants: [...participantsOf(targetActivity), selectedStudent],
    };

    updateActivity(sourceActivityId, updatedSourceActivity);
    updateActivity(targetActivityId, updatedTargetActivity);

    toast.success(
      `Student redirected from "${sourceActivity.title}" to "${targetActivity.title}"`
    );
    setIsRedirectDialogOpen(false);
    setSelectedStudent(null);
    setSourceActivityId("");
    setTargetActivityId("");
  };

  const openRedirectDialog = (studentId: string, activityId: string) => {
    setSelectedStudent(studentId);
    setSourceActivityId(activityId);
    setTargetActivityId("");
    setIsRedirectDialogOpen(true);
  };

  const getStudentName = (studentId: string) => {
    const student = allStudents.find((s) => s.id === studentId);
    return student?.name || "Unknown Student";
  };

  const getStudentEmail = (studentId: string) => {
    const student = allStudents.find((s) => s.id === studentId);
    return student?.email || "";
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Redirect Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage and redirect student registrations between activities
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
            <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {activitiesWithRegistrations.reduce((sum, a) => sum + participantsOf(a).length, 0)}{" "}
              Registrations
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search students by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        {/* Student Registrations Table */}
        {filteredStudents.length > 0 ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Current Activity
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const registrations = studentRegistrations.get(student.id) || [];
                    if (registrations.length === 0) return null;

                    return registrations.map((activity) => (
                      <tr
                        key={`${student.id}-${activity.id}`}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{activity.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {(() => {
                            const d = parseISO(activity.date ?? "");
                            return isValid(d) ? d.toLocaleDateString() : "—";
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const d = parseISO(activity.date ?? "");
                            const ok = isValid(d);
                            return ok && d > new Date() ? (
                              <Badge className="bg-green-500">Upcoming</Badge>
                            ) : (
                              <Badge variant="secondary">Past</Badge>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRedirectDialog(student.id, activity.id)}
                            disabled={(() => {
                              const d = parseISO(activity.date ?? "");
                              return (
                                getAvailableActivities(activity.id).length === 0 ||
                                !isValid(d) ||
                                d <= new Date()
                              );
                            })()}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Redirect
                          </Button>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px] bg-muted/30 rounded-lg">
            <div className="text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground mb-2">
                No student registrations found
              </p>
              <p className="text-muted-foreground">
                Students will appear here once they register for activities
              </p>
            </div>
          </div>
        )}

        {/* Redirect Dialog */}
        <Dialog open={isRedirectDialogOpen} onOpenChange={setIsRedirectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redirect Student</DialogTitle>
              <DialogDescription>
                Transfer the student from one activity to another. Their spot in the current
                activity will be freed up.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedStudent && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Student</p>
                  <p className="font-medium text-foreground">
                    {getStudentName(selectedStudent)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getStudentEmail(selectedStudent)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Current Activity (Source)
                </label>
                <Select value={sourceActivityId} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {activities
                      .filter((a) => a.id === sourceActivityId)
                      .map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Target Activity
                </label>
                <Select value={targetActivityId} onValueChange={setTargetActivityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableActivities(sourceActivityId).map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.title} ({participantsOf(activity).length}/{maxCapOf(activity)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getAvailableActivities(sourceActivityId).length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 mt-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>No available activities with open spots</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRedirectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRedirect}
                disabled={!targetActivityId || getAvailableActivities(sourceActivityId).length === 0}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Redirect Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Statistics */}
        {activitiesWithRegistrations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">Total Registrations</p>
              <p className="text-3xl font-bold text-foreground">
                {activitiesWithRegistrations.reduce((sum, a) => sum + participantsOf(a).length, 0)}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">Active Registrations</p>
              <p className="text-3xl font-bold text-foreground">
                {
                  activitiesWithRegistrations
                    .filter((a) => {
                      const d = parseISO(a.date ?? "");
                      return isValid(d) && d > new Date();
                    })
                    .reduce((sum, a) => sum + participantsOf(a).length, 0)
                }
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">Available Spots</p>
              <p className="text-3xl font-bold text-foreground">
                {activities.reduce(
                  (sum, a) => sum + Math.max(0, maxCapOf(a) - participantsOf(a).length),
                  0,
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
