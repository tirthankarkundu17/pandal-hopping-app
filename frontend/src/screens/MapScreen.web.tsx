import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';
import dataService from '../services';
import { Pandal } from '../api/pandals';
import * as Location from 'expo-location';

// Web specific imports
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon not loading in React correctly
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Ensure Leaflet fetches assets safely if Metro refuses to require them
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function MapScreen() {
    const [pandals, setPandals] = useState<Pandal[]>([]);
    const [loading, setLoading] = useState(true);
    // previously, we tracked a single selected pandal:
    // const [selectedPandal, setSelectedPandal] = useState<Pandal | null>(null);
    const [selectedPandals, setSelectedPandals] = useState<string[]>([]);
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null);
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
    const hasInitLocation = React.useRef(false);

    const loadPandals = useCallback(async (loc?: Location.LocationObject) => {
        try {
            setLoading(true);
            const params = loc ? {
                lng: loc.coords.longitude,
                lat: loc.coords.latitude,
                radius: 500000000
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
            if (hasInitLocation.current) return;
            hasInitLocation.current = true;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setInitialCenter([22.5726, 88.3639]);
                    loadPandals();
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({});
                setCurrentLocation(loc);
                setInitialCenter([loc.coords.latitude, loc.coords.longitude]);
                loadPandals(loc);
            } catch (error) {
                console.error('Error getting location', error);
                setInitialCenter([22.5726, 88.3639]);
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
            if (mapInstance) {
                mapInstance.flyTo([loc.coords.latitude, loc.coords.longitude], 13, { animate: true });
            }
        } catch (error) {
            console.error('Error getting location', error);
        }
    }, [mapInstance]);

    const togglePandalSelection = useCallback((pandalId: string) => {
        setSelectedPandals((prev) => {
            if (prev.includes(pandalId)) {
                return prev.filter((id) => id !== pandalId);
            } else {
                return [...prev, pandalId];
            }
        });
    }, []);

    // previous simplistic Google Maps launcher (single destination only)
    // const openGoogleMaps = useCallback(async () => {
    //     try {
    //         let latitude: number;
    //         let longitude: number;
    //
    //         if (currentLocation) {
    //             latitude = currentLocation.coords.latitude;
    //             longitude = currentLocation.coords.longitude;
    //         } else if (pandals.length > 0) {
    //             const firstPandal = pandals[0];
    //             const coords = firstPandal.location?.coordinates;
    //             if (coords && coords.length === 2) {
    //                 latitude = coords[1];
    //                 longitude = coords[0];
    //             } else {
    //                 alert('No location available');
    //                 return;
    //             }
    //         } else {
    //             alert('Please wait for locations to load');
    //             return;
    //         }
    //
    //         const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${latitude},${longitude}`;
    //         await Linking.openURL(webUrl);
    //     } catch (error) {
    //         console.error('Error opening Google Maps:', error);
    //         alert('Unable to open Google Maps');
    //     }
    // }, [currentLocation, pandals]);

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

            // Build Google Maps URL
            let webUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destination}`;

            // Add waypoints if available
            if (waypoints.length > 0) {
                webUrl += `&waypoints=${waypoints.join('|')}`;
            }

            await Linking.openURL(webUrl);
        } catch (error) {
            console.error('Error opening Google Maps:', error);
            alert('Unable to open Google Maps');
        }
    }, [currentLocation, pandals, selectedPandals]);

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill}>
                {initialCenter ? (
                    <MapContainer
                        ref={setMapInstance}
                        center={initialCenter}
                        zoom={13}
                        style={{ height: '100%', width: '100%', zIndex: 1 }}
                    >
                        <TileLayer
                            // legacy HTML attribution string pulled from OpenStreetMap
                        // kept here commented in case we ever need to switch to a
                        // plain-text fallback.  The tag is required by the OSM
                        // terms but we store it explicitly for clarity.
                        // attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {currentLocation && (
                            <LeafletMarker
                                position={[currentLocation.coords.latitude, currentLocation.coords.longitude]}
                                icon={L.divIcon({
                                    className: 'custom-location-dot',
                                    html: `<div style="width: 14px; height: 14px; background: #007AFF; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                                    iconSize: [18, 18],
                                    iconAnchor: [9, 9]
                                })}
                            >
                                <Popup>You are here</Popup>
                            </LeafletMarker>
                        )}

                        {pandals.map((p) => {
                            const coords = p.location?.coordinates;
                            if (!coords || coords.length !== 2) return null;
                            const isSelected = selectedPandals.includes(p.id);
                            const selectionIndex = selectedPandals.indexOf(p.id) + 1;

                            return (
                                <LeafletMarker
                                    key={p.id}
                                    position={[coords[1], coords[0]]}
                                    icon={L.divIcon({
                                        className: `custom-pandal-marker ${isSelected ? 'selected' : ''}`,
                                        html: `<div style="background-color: ${isSelected ? '#FFD700' : COLORS.primary}; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: ${isSelected ? '3px' : '2px'} solid white; box-shadow: 2px 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; margin-left: 2px; margin-top: 2px;"><svg xmlns=\"http://www.w3.org/2000/svg\" height=\"20\" width=\"20\" viewBox=\"0 0 24 24\"><path d=\"M20 11v2h-2L15 3V1h-2v2h-2V1H9v2H7L3.8 13H2v2h2v8h5v-5h6v5h5v-8h2zm-10.5 0L12 6.47 14.5 11h-5z\" fill=\"white\"/></svg></div></div>${isSelected ? `<div style=\"position: absolute; top: -8px; right: -8px; background-color: #FFD700; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-weight: bold; font-size: 12px; color: black;\">${selectionIndex}</div>` : ''}`,
                                        iconSize: [38, 38],
                                        iconAnchor: [19, 38]
                                    })}
                                    eventHandlers={{
                                        click: () => togglePandalSelection(p.id),
                                    }}
                                >
                                    <Popup>
                                        <View>
                                            <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{p.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#666' }}>{p.area}</Text>
                                            <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 4 }}>
                                                Tap to {isSelected ? 'deselect' : 'select'}
                                            </Text>
                                        </View>
                                    </Popup>
                                </LeafletMarker>
                            );
                        })}
                    </MapContainer>
                ) : null}
            </View>

            <TouchableOpacity
                style={styles.myLocationButton}
                onPress={goToMyLocation}
                activeOpacity={0.8}
            >
                <Ionicons name="navigate" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.googleMapsButton}
                onPress={openGoogleMaps}
                activeOpacity={0.8}
            >
                <Ionicons name="map" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}

            {/* Selected Pandals Summary */}
            {selectedPandals.length > 0 && (
                <View style={styles.selectionSummaryContainer}>
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
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 4, 28, 0.4)',
        zIndex: 2000,
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
        maxWidth: 400,
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
        zIndex: 500, // Important on web to sit above leaflet map layer
    },
    googleMapsButton: {
        position: 'absolute',
        bottom: 180,
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
        zIndex: 500,
    },
    selectionSummaryContainer: {
        position: 'absolute',
        top: SPACING.xl,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 20,
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
