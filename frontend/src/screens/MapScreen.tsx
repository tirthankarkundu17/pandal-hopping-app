import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Linking } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';
import dataService from '../services';
import { Pandal } from '../api/pandals';

export function MapScreen() {
    const [pandals, setPandals] = useState<Pandal[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPandals, setSelectedPandals] = useState<string[]>([]);
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [initialRegion, setInitialRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
    const mapRef = React.useRef<MapView>(null);

    const loadPandals = useCallback(async (loc?: Location.LocationObject) => {
        try {
            setLoading(true);
            const params = loc ? {
                lng: loc.coords.longitude,
                lat: loc.coords.latitude,
                radius: 5000
            } : undefined;
            const data = await dataService.getPandals(params);
            setPandals(data);
        } catch (error) {
            console.error('Error fetching map pandals:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setInitialRegion({
                        latitude: 22.5726,
                        longitude: 88.3639,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    });
                    loadPandals();
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({});
                setCurrentLocation(loc);
                setInitialRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
                loadPandals(loc);
            } catch (error) {
                console.error('Error getting location', error);
                setInitialRegion({
                    latitude: 22.5726,
                    longitude: 88.3639,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
                loadPandals();
            }
        })();
    }, [loadPandals]);

    const goToMyLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const loc = await Location.getCurrentPositionAsync({});
            setCurrentLocation(loc);
            mapRef.current?.animateToRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        } catch (error) {
            console.error('Error getting location', error);
        }
    }, []);

    // helper to toggle selection of a pandal (replaces single selection logic)
    const togglePandalSelection = useCallback((pandalId: string) => {
        setSelectedPandals((prev) => {
            if (prev.includes(pandalId)) {
                return prev.filter((id) => id !== pandalId);
            } else {
                return [...prev, pandalId];
            }
        });
    }, []);

    const openGoogleMaps = useCallback(async () => {
        try {
            let startLat: number;
            let startLng: number;
            const waypoints: string[] = [];
            let destination = '';

            // Set starting point
            if (currentLocation) {
                startLat = currentLocation.coords.latitude;
                startLng = currentLocation.coords.longitude;
            } else if (pandals.length > 0) {
                const firstPandal = pandals[0];
                const coords = firstPandal.location?.coordinates;
                if (coords && coords.length === 2) {
                    startLat = coords[1];
                    startLng = coords[0];
                } else {
                    alert('No location available');
                    return;
                }
            } else {
                alert('Please wait for locations to load');
                return;
            }

            // Build waypoints from selected pandals
            if (selectedPandals.length > 0) {
                selectedPandals.forEach((pandalId) => {
                    const pandal = pandals.find((p) => p.id === pandalId);
                    if (pandal && pandal.location?.coordinates) {
                        const coords = pandal.location.coordinates;
                        waypoints.push(`${coords[1]},${coords[0]}`);
                    }
                });

                if (waypoints.length === 0) {
                    alert('Selected locations have no valid coordinates');
                    return;
                }

                destination = waypoints[waypoints.length - 1];
                waypoints.pop(); // Remove last waypoint since it will be the destination
            } else if (pandals.length > 0) {
                // Fallback to first pandal if nothing is selected
                const firstPandal = pandals[0];
                const coords = firstPandal.location?.coordinates;
                if (coords && coords.length === 2) {
                    destination = `${coords[1]},${coords[0]}`;
                }
            }

            if (!destination) {
                alert('No destination available');
                return;
            }

            // Build Google Maps URLs
            let nativeUrl = `googlemaps://?saddr=${startLat},${startLng}&daddr=${destination}&directionsmode=driving`;
            let webUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destination}`;

            // Add waypoints if available
            if (waypoints.length > 0) {
                nativeUrl += `&waypoints=${waypoints.join('|')}`;
                webUrl += `&waypoints=${waypoints.join('|')}`;
            }

            const supported = await Linking.canOpenURL(nativeUrl);
            if (supported) {
                await Linking.openURL(nativeUrl);
            } else {
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            console.error('Error opening Google Maps:', error);
            alert('Unable to open Google Maps');
        }
    }, [currentLocation, pandals, selectedPandals]);

    return (
        <View style={styles.container}>
            {initialRegion ? (
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                >
                    {currentLocation && (
                        <Marker
                            coordinate={{
                                latitude: currentLocation.coords.latitude,
                                longitude: currentLocation.coords.longitude,
                            }}
                            title="You are here"
                            zIndex={999}
                        >
                            <View style={styles.currentLocationMarker}>
                                <View style={styles.currentLocationDot} />
                            </View>
                        </Marker>
                    )}
                    {pandals.map((p) => {
                        const coords = p.location?.coordinates;
                        if (!coords || coords.length !== 2) return null;
                        const isSelected = selectedPandals.includes(p.id);

                        return (
                            <Marker
                                key={p.id}
                                coordinate={{
                                    latitude: coords[1], // GeoJSON is [lng, lat]
                                    longitude: coords[0]
                                }}
                                onPress={() => togglePandalSelection(p.id)}
                            >
                                <View style={[styles.pandalPin, isSelected && styles.pandalPinSelected]}>
                                    <View style={styles.pandalIconContainer}>
                                        <MaterialCommunityIcons name="temple-hindu" size={18} color="#FFF" />
                                    </View>
                                </View>
                                {isSelected && (
                                    <View style={styles.selectionBadge}>
                                        <Text style={styles.selectionBadgeText}>
                                            {selectedPandals.indexOf(p.id) + 1}
                                        </Text>
                                    </View>
                                )}
                                <Callout tooltip>
                                    <View style={styles.calloutContainer}>
                                        <Text style={styles.calloutTitle}>{p.name}</Text>
                                        <Text style={styles.calloutSubtitle}>{p.area}</Text>
                                        <Text style={styles.calloutHint}>Tap to {isSelected ? 'deselect' : 'select'}</Text>
                                    </View>
                                </Callout>
                            </Marker>
                        );
                    })}
                </MapView>
            ) : null}

            <TouchableOpacity
                style={styles.myLocationButton}
                onPress={goToMyLocation}
                activeOpacity={0.8}
            >
                <Ionicons name="navigate" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}

            {/* Selected Pandals Summary + Google Maps button */}
            {selectedPandals.length > 0 && (
                <View style={styles.selectionSummaryContainer}>
                    <View style={styles.selectionSummaryRow}>
                        <View style={styles.selectionSummary}>
                            <Text style={styles.selectionSummaryText}>
                                {selectedPandals.length} pandal{selectedPandals.length > 1 ? 's' : ''} selected
                            </Text>
                            <TouchableOpacity
                                style={styles.clearSelectionBtn}
                                onPress={() => setSelectedPandals([])}
                            >
                                <Text style={styles.clearSelectionBtnText}>Clear</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.googleMapsButton}
                            onPress={openGoogleMaps}
                            activeOpacity={0.8}
                            accessibilityLabel="Open selected pandals in Google Maps"
                            accessibilityHint="Opens directions for selected pandals in Google Maps"
                            {...({ title: 'Open selected pandals in Google Maps' } as any)}
                        >
                            <Ionicons name="map" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 4, 28, 0.4)',
    },
    myLocationButton: {
        position: 'absolute',
        bottom: 120,
        right: SPACING.md,
        backgroundColor: COLORS.bgCard,
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        zIndex: 10,
    },
    googleMapsButton: {
        backgroundColor: COLORS.bgCard,
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        ...SHADOWS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginLeft: SPACING.sm,
        zIndex: 20,
    },
    pandalPin: {
        width: 38,
        height: 38,
        backgroundColor: COLORS.primary,
        borderRadius: 19,
        borderBottomRightRadius: 0,
        transform: [{ rotate: '-45deg' }],
        borderWidth: 2,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    pandalIconContainer: {
        transform: [{ rotate: '45deg' }],
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 2, // visual compensation for tear-drop rotation centering
        marginTop: 2,
    },
    calloutContainer: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        minWidth: 120,
        borderColor: COLORS.border,
        borderWidth: 1,
    },
    calloutTitle: {
        fontSize: FONTS.sizes.sm,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    calloutSubtitle: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textSecondary,
    },
    calloutHint: {
        fontSize: 9,
        color: COLORS.primary,
        marginTop: 4,
        fontStyle: 'italic',
    },
    carouselContainer: {
        position: 'absolute',
        bottom: SPACING.xl,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        width: '90%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.card,
    },
    cardImage: {
        width: 60,
        height: 60,
        borderRadius: RADIUS.md,
    },
    placeholderImage: {
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    cardTitle: {
        fontSize: FONTS.sizes.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textSecondary,
    },
    cardDescription: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
        lineHeight: 16,
    },
    directionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
        marginTop: SPACING.sm,
        alignSelf: 'flex-start',
    },
    directionBtnText: {
        color: '#FFF',
        fontSize: FONTS.sizes.xs,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    closeBtn: {
        padding: SPACING.sm,
    },
    currentLocationMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 122, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentLocationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
        borderWidth: 2,
        borderColor: '#fff',
    },
    pandalPinSelected: {
        backgroundColor: COLORS.primary,
        borderColor: '#FFD700',
        borderWidth: 3,
    },
    selectionBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#FFD700',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    selectionBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    selectionSummaryContainer: {
        position: 'absolute',
        top: SPACING.xl,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 20,
    },
    selectionSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionSummary: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.card,
        minWidth: 250,
    },
    selectionSummaryText: {
        fontSize: FONTS.sizes.sm,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        flex: 1,
    },
    clearSelectionBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.sm,
        marginLeft: SPACING.sm,
    },
    clearSelectionBtnText: {
        color: '#FFF',
        fontSize: FONTS.sizes.xs,
        fontWeight: 'bold',
    }
});
