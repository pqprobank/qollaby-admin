"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  updateStateName,
  deleteState,
  Location,
} from "@/lib/location-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Search,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  Plus,
  Building2,
  Map,
  Check,
} from "lucide-react";

// Complete list of US states (hardcoded for reference when states are deleted from DB)
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
] as const;

export default function LocationsPage() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    location: Location | null;
  }>({ open: false, location: null });
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editOrder, setEditOrder] = useState(1);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    location: Location | null;
  }>({ open: false, location: null });

  // State edit dialog
  const [editStateDialog, setEditStateDialog] = useState<{
    open: boolean;
    stateName: string | null;
  }>({ open: false, stateName: null });
  const [newStateName, setNewStateName] = useState("");

  // State delete dialog
  const [deleteStateDialog, setDeleteStateDialog] = useState<{
    open: boolean;
    stateName: string | null;
    cityCount: number;
  }>({ open: false, stateName: null, cityCount: 0 });

  // Create dialog state
  const [createDialog, setCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<"state" | "city">("state"); // "state" = add new state, "city" = add city to existing state
  const [createState, setCreateState] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createOrder, setCreateOrder] = useState(1);
  const [creating, setCreating] = useState(false);

  // Error state for name validation
  const [editCityError, setEditCityError] = useState("");
  const [editStateError, setEditStateError] = useState("");
  const [createCityError, setCreateCityError] = useState("");

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const toggleExpand = (state: string) => {
    setExpandedStates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(state)) {
        newSet.delete(state);
      } else {
        newSet.add(state);
      }
      return newSet;
    });
  };

  const openEditDialog = (location: Location) => {
    setEditState(location.state);
    setEditCity(location.city);
    setEditOrder(location.order);
    setEditCityError("");
    setEditDialog({ open: true, location });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.location || !editCity.trim()) return;

    // Check for duplicate city name within the same state
    const trimmedCity = editCity.trim().toLowerCase();
    const isDuplicate = locations.some(
      (loc) =>
        loc.$id !== editDialog.location?.$id &&
        loc.state === editDialog.location?.state &&
        loc.city.toLowerCase() === trimmedCity
    );

    if (isDuplicate) {
      setEditCityError("A city with this name already exists in this state");
      return;
    }

    setEditCityError("");
    setActionLoading(editDialog.location.$id);
    try {
      // Only update city and order, not state
      await updateLocation(editDialog.location.$id, {
        city: editCity.trim(),
        order: editOrder,
      });

      // Update local state
      setLocations((prev) =>
        prev.map((loc) =>
          loc.$id === editDialog.location?.$id
            ? { ...loc, city: editCity.trim(), order: editOrder }
            : loc
        )
      );
      setEditDialog({ open: false, location: null });
    } catch (error) {
      console.error("Failed to update location:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.location) return;

    setActionLoading(deleteDialog.location.$id);
    try {
      const success = await deleteLocation(deleteDialog.location.$id);
      if (success) {
        setLocations((prev) =>
          prev.filter((loc) => loc.$id !== deleteDialog.location?.$id)
        );
      }
      setDeleteDialog({ open: false, location: null });
    } catch (error) {
      console.error("Failed to delete location:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateDialog = (state?: string) => {
    if (state) {
      // Adding city to existing state
      setCreateMode("city");
      setCreateState(state);
    } else {
      // Adding new state
      setCreateMode("state");
      setCreateState("");
    }
    setCreateCity("");
    setCreateOrder(1);
    setCreateCityError("");
    setCreateDialog(true);
  };

  // State edit handlers
  const openEditStateDialog = (stateName: string) => {
    setNewStateName(stateName);
    setEditStateError("");
    setEditStateDialog({ open: true, stateName });
  };

  const handleSaveStateEdit = async () => {
    if (!editStateDialog.stateName || !newStateName.trim()) return;
    if (editStateDialog.stateName === newStateName.trim()) {
      setEditStateDialog({ open: false, stateName: null });
      return;
    }

    // Check for duplicate state name
    const trimmedState = newStateName.trim().toLowerCase();
    const isDuplicate = states.some(
      (s) =>
        s !== editStateDialog.stateName &&
        s.toLowerCase() === trimmedState
    );

    if (isDuplicate) {
      setEditStateError("A state with this name already exists");
      return;
    }

    setEditStateError("");
    setActionLoading(`state-${editStateDialog.stateName}`);
    try {
      const success = await updateStateName(editStateDialog.stateName, newStateName.trim());
      if (success) {
        // Update local state
        setLocations((prev) =>
          prev.map((loc) =>
            loc.state === editStateDialog.stateName
              ? { ...loc, state: newStateName.trim() }
              : loc
          )
        );
        // Update expanded states
        setExpandedStates((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(editStateDialog.stateName!)) {
            newSet.delete(editStateDialog.stateName!);
            newSet.add(newStateName.trim());
          }
          return newSet;
        });
      }
      setEditStateDialog({ open: false, stateName: null });
    } catch (error) {
      console.error("Failed to update state:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // State delete handlers
  const openDeleteStateDialog = (stateName: string, cityCount: number) => {
    setDeleteStateDialog({ open: true, stateName, cityCount });
  };

  const handleDeleteState = async () => {
    if (!deleteStateDialog.stateName) return;

    setActionLoading(`state-${deleteStateDialog.stateName}`);
    try {
      const success = await deleteState(deleteStateDialog.stateName);
      if (success) {
        setLocations((prev) =>
          prev.filter((loc) => loc.state !== deleteStateDialog.stateName)
        );
        setExpandedStates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(deleteStateDialog.stateName!);
          return newSet;
        });
      }
      setDeleteStateDialog({ open: false, stateName: null, cityCount: 0 });
    } catch (error) {
      console.error("Failed to delete state:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!createState.trim()) return;
    if (createMode === "city" && !createCity.trim()) return;

    // Check for duplicate city name within the same state (only for city mode)
    if (createMode === "city") {
      const trimmedCity = createCity.trim().toLowerCase();
      const isDuplicate = locations.some(
        (loc) =>
          loc.state === createState &&
          loc.city.toLowerCase() === trimmedCity
      );

      if (isDuplicate) {
        setCreateCityError("A city with this name already exists in this state");
        return;
      }
    }

    setCreateCityError("");
    setCreating(true);
    try {
      // Generate locationId from state and city
      const stateCode = createState
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toLowerCase()
        .slice(0, 2);

      if (createMode === "state") {
        // Adding a new state - create a placeholder record
        const locationId = `${stateCode}_state`;
        const newLocation = await createLocation({
          locationId,
          state: createState.trim(),
          city: "", // Empty city as placeholder
          order: 1, // Order 1 for state placeholder (must be 1-100)
        });

        if (newLocation) {
          setLocations((prev) => [...prev, newLocation]);
          // Expand the new state
          setExpandedStates((prev) => new Set([...prev, createState.trim()]));
        }
      } else {
        // Adding a city to existing state
        const citySlug = createCity
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
        const locationId = `${stateCode}_${citySlug}`;

        const newLocation = await createLocation({
          locationId,
          state: createState.trim(),
          city: createCity.trim(),
          order: createOrder,
        });

        if (newLocation) {
          setLocations((prev) => [...prev, newLocation]);
          // Expand the state
          setExpandedStates((prev) => new Set([...prev, createState.trim()]));
        }
      }
      setCreateDialog(false);
    } catch (error) {
      console.error("Failed to create location:", error);
    } finally {
      setCreating(false);
    }
  };

  // Get unique states
  const states = [...new Set(locations.map((l) => l.state))].sort();

  // Get cities by state (excluding empty city placeholders)
  const getCitiesByState = (state: string) =>
    locations
      .filter((l) => l.state === state && l.city.trim() !== "")
      .sort((a, b) => a.order - b.order);

  // Filter states by search
  const filteredStates =
    stateFilter !== "all"
      ? states.filter((s) => s === stateFilter)
      : search
      ? states.filter(
          (s) =>
            s.toLowerCase().includes(search.toLowerCase()) ||
            locations.some(
              (l) =>
                l.state === s &&
                l.city.toLowerCase().includes(search.toLowerCase())
            )
        )
      : states;

  // Stats
  const totalStates = states.length;
  const totalCities = locations.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Location Management
          </h1>
          <p className="text-muted-foreground">
            Manage US states and cities
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLocations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total States
            </CardTitle>
            <Map className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalStates}</div>
            <p className="text-xs text-muted-foreground">US States</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cities
            </CardTitle>
            <Building2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{totalCities}</div>
            <p className="text-xs text-muted-foreground">All cities</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search states or cities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-input/50 border-border/50"
                />
              </div>
            </form>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-secondary/50 border-border/50 min-w-[150px]"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {stateFilter === "all" ? "All States" : stateFilter}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border-border/50 max-h-[300px] overflow-y-auto"
              >
                <DropdownMenuItem
                  onClick={() => setStateFilter("all")}
                  className="cursor-pointer"
                >
                  {stateFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                  <span className={stateFilter !== "all" ? "ml-6" : ""}>
                    All States
                  </span>
                </DropdownMenuItem>
                {states.map((state) => (
                  <DropdownMenuItem
                    key={state}
                    onClick={() => setStateFilter(state)}
                    className="cursor-pointer"
                  >
                    {stateFilter === state && (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    <span className={stateFilter !== state ? "ml-6" : ""}>
                      {state}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Locations table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Locations</CardTitle>
          <Button size="sm" onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add State
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground w-[40%]">
                  State / City
                </TableHead>
                <TableHead className="text-muted-foreground">
                  Location ID
                </TableHead>
                <TableHead className="text-muted-foreground">Order</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredStates.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={4} className="h-48">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mb-4 opacity-50" />
                      <p>No locations found</p>
                      {search && (
                        <p className="text-sm mt-2">
                          Try a different search term
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // State rows
                filteredStates.map((state) => {
                  const cities = getCitiesByState(state);
                  const isExpanded = expandedStates.has(state);

                  return (
                    <React.Fragment key={state}>
                      {/* State row */}
                      <TableRow className="border-border/30 hover:bg-secondary/30 bg-secondary/10">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpand(state)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <Map className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{state}</p>
                              <p className="text-xs text-muted-foreground">
                                {cities.length} cities
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            {cities.length} locations
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => openCreateDialog(state)}
                              title="Add city to this state"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-secondary"
                              onClick={() => openEditStateDialog(state)}
                              disabled={actionLoading === `state-${state}`}
                              title="Edit state name"
                            >
                              {actionLoading === `state-${state}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Pencil className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openDeleteStateDialog(state, cities.length)}
                              disabled={actionLoading === `state-${state}`}
                              title="Delete state and all cities"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* City rows */}
                      {isExpanded &&
                        cities.map((location) => (
                          <TableRow
                            key={location.$id}
                            className="border-border/30 hover:bg-secondary/30"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3 pl-10">
                                <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <p className="text-sm">{location.city}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                {location.locationId}
                              </code>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {location.order}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-secondary"
                                  onClick={() => openEditDialog(location)}
                                  disabled={actionLoading === location.$id}
                                >
                                  {actionLoading === location.$id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Pencil className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() =>
                                    setDeleteDialog({ open: true, location })
                                  }
                                  disabled={actionLoading === location.$id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, location: null })}
      >
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
            <DialogDescription>Update the city details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editState">State</Label>
              <Input
                id="editState"
                value={editState}
                disabled
                className="bg-muted/50 border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                State cannot be changed. Use the state edit button to rename.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCity">City *</Label>
              <Input
                id="editCity"
                value={editCity}
                onChange={(e) => {
                  setEditCity(e.target.value);
                  setEditCityError("");
                }}
                placeholder="City name"
                className={`bg-input/50 ${editCityError ? "border-destructive" : "border-border/50"}`}
              />
              {editCityError && (
                <p className="text-xs text-destructive">{editCityError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editOrder">Order</Label>
              <Input
                id="editOrder"
                type="number"
                min={1}
                max={100}
                value={editOrder}
                onChange={(e) => setEditOrder(parseInt(e.target.value) || 1)}
                className="bg-input/50 border-border/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, location: null })}
              className="bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                actionLoading !== null ||
                !editState.trim() ||
                !editCity.trim()
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, location: null })}
      >
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deleteDialog.location?.city}, {deleteDialog.location?.state}
              </strong>
              ?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>
              {createMode === "state" ? "Add State" : "Add City"}
            </DialogTitle>
            <DialogDescription>
              {createMode === "state"
                ? "Add a new state to the list."
                : `Add a new city to ${createState}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createMode === "state" ? (
              // Add State mode - select from complete US states list
              <div className="space-y-2">
                <Label htmlFor="createState">Select State *</Label>
                <select
                  id="createState"
                  value={createState}
                  onChange={(e) => setCreateState(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-border/50 bg-input/50 text-sm"
                >
                  <option value="">-- Select a state --</option>
                  {US_STATES.map((stateName) => {
                    const isExisting = states.includes(stateName);
                    return (
                      <option 
                        key={stateName} 
                        value={stateName}
                        disabled={isExisting}
                      >
                        {stateName} {isExisting ? "(already exists)" : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-muted-foreground">
                  States already in the list are disabled
                </p>
              </div>
            ) : (
              // Add City mode - state is fixed, enter city
              <>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={createState}
                    disabled
                    className="bg-muted/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createCity">City Name *</Label>
                  <Input
                    id="createCity"
                    value={createCity}
                    onChange={(e) => {
                      setCreateCity(e.target.value);
                      setCreateCityError("");
                    }}
                    placeholder="e.g., Los Angeles"
                    className={`bg-input/50 ${createCityError ? "border-destructive" : "border-border/50"}`}
                  />
                  {createCityError && (
                    <p className="text-xs text-destructive">{createCityError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createOrder">Display Order</Label>
                  <Input
                    id="createOrder"
                    type="number"
                    min={1}
                    value={createOrder}
                    onChange={(e) => setCreateOrder(parseInt(e.target.value) || 1)}
                    className="bg-input/50 border-border/50"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialog(false)}
              className="bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                !createState.trim() ||
                (createMode === "city" && !createCity.trim())
              }
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {createMode === "state" ? "Create State" : "Create City"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit State dialog */}
      <Dialog
        open={editStateDialog.open}
        onOpenChange={(open) => setEditStateDialog({ open, stateName: null })}
      >
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Edit State</DialogTitle>
            <DialogDescription>
              Update the state name. This will update all cities in this state.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newStateName">State Name</Label>
              <Input
                id="newStateName"
                value={newStateName}
                onChange={(e) => {
                  setNewStateName(e.target.value);
                  setEditStateError("");
                }}
                placeholder="State name"
                className={`bg-input/50 ${editStateError ? "border-destructive" : "border-border/50"}`}
              />
              {editStateError && (
                <p className="text-xs text-destructive">{editStateError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditStateDialog({ open: false, stateName: null })}
              className="bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStateEdit}
              disabled={actionLoading !== null || !newStateName.trim()}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete State confirmation dialog */}
      <AlertDialog
        open={deleteStateDialog.open}
        onOpenChange={(open) =>
          setDeleteStateDialog({ open, stateName: null, cityCount: 0 })
        }
      >
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete State</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteStateDialog.stateName}</strong>?
              <br />
              <br />
              <span className="text-destructive font-medium">
                This will permanently delete all {deleteStateDialog.cityCount} cities in this state.
              </span>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteState}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete State
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
