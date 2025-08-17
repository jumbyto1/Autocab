import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFleetSchema, type Fleet, type InsertFleet } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Car, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function FleetManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<Fleet | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: fleets = [], isLoading } = useQuery({
    queryKey: ["/api/fleets"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertFleet) =>
      apiRequest("/api/fleets", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleets"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Fleet Created",
        description: "New fleet has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create fleet",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertFleet> }) =>
      apiRequest(`/api/fleets/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleets"] });
      setEditingFleet(null);
      toast({
        title: "Fleet Updated",
        description: "Fleet has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fleet",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/fleets/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleets"] });
      toast({
        title: "Fleet Deleted",
        description: "Fleet has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete fleet",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<InsertFleet>({
    resolver: zodResolver(insertFleetSchema),
    defaultValues: {
      name: "",
      description: "",
      vehicleCallsigns: [],
      isActive: true,
    },
  });

  const editForm = useForm<InsertFleet>({
    resolver: zodResolver(insertFleetSchema),
    defaultValues: {
      name: "",
      description: "",
      vehicleCallsigns: [],
      isActive: true,
    },
  });

  const onCreateSubmit = (data: InsertFleet) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertFleet) => {
    if (!editingFleet) return;
    updateMutation.mutate({
      id: editingFleet.id,
      data: data,
    });
  };

  const handleEdit = (fleet: Fleet) => {
    setEditingFleet(fleet);
    editForm.reset({
      name: fleet.name,
      description: fleet.description || "",
      vehicleCallsigns: fleet.vehicleCallsigns?.join(', ') as any,
      isActive: fleet.isActive,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this fleet?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading fleets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Fleet Management</h1>
              <p className="text-muted-foreground text-sm md:text-base">Create and manage custom vehicle fleets</p>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Fleet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Fleet</DialogTitle>
              <DialogDescription>
                Create a custom fleet with specific vehicle callsigns
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fleet Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter fleet name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Fleet description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="vehicleCallsigns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Callsigns</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="402,417,423,450,408,999,407,420,415,409,55,404,400,996,403,401,411,998,413,414,418,419"
                          rows={6}
                          {...field}
                          value={typeof field.value === 'string' ? field.value : field.value?.join(', ') || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated list of vehicle callsigns to include in this fleet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Fleet"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fleets.map((fleet: Fleet) => (
          <Card key={fleet.id} className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{fleet.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={fleet.isActive ? "default" : "secondary"}>
                    {fleet.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(fleet)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(fleet.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardDescription>{fleet.description || "No description"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {fleet.vehicleCallsigns?.length || 0} Vehicles
                  </span>
                </div>
                {fleet.vehicleCallsigns && fleet.vehicleCallsigns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {fleet.vehicleCallsigns.map((callsign, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {callsign}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingFleet} onOpenChange={() => setEditingFleet(null)}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Fleet</DialogTitle>
              <DialogDescription>
                Update fleet details and vehicle assignments
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fleet Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter fleet name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Fleet description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="vehicleCallsigns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Callsigns</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter vehicle callsigns separated by commas (e.g., 997, 998, 999)"
                          {...field}
                          value={typeof field.value === 'string' ? field.value : field.value?.join(', ') || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated list of vehicle callsigns to include in this fleet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Fleet"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {fleets.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Fleets Created</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first custom fleet to organize your vehicles
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Fleet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}