"use client";

import React, { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import LeaguePromotionModal from "@/components/modal/LeaguePromotionModal";

const PromotionManager = () => {
    const { user, isLoaded, isSignedIn } = useUser();
    const [showModal, setShowModal] = useState(false);
    const [isPageReady, setIsPageReady] = useState(false);
    const [leagueResult, setLeagueResult] = useState<{
        status: "promoted" | "demoted" | "safe";
        leagueType: "bronze" | "silver" | "gold";
    } | null>(null);

    // Ref to prevent multiple simultaneous fetches
    const isFetching = useRef(false);

    // Wait for page to be completely loaded
    useEffect(() => {
        const handleLoad = () => {
            setIsPageReady(true);
        };

        if (document.readyState === "complete") {
            handleLoad();
        } else {
            window.addEventListener("load", handleLoad);
            return () => window.removeEventListener("load", handleLoad);
        }
    }, []);

    useEffect(() => {
        const checkPromotion = async () => {
            if (!isLoaded || !isSignedIn || !user?.id || !isPageReady) {
                return;
            }

            if (isFetching.current) return;

            try {
                isFetching.current = true;
                const response = await fetch("/api/league");

                if (response.ok) {
                    const data = await response.json();
                    const userPoints = data.userPoints;
                    const lastSeasonResult = userPoints?.lastSeasonResult;

                    if (lastSeasonResult && lastSeasonResult.viewed === false) {
                        // Determine display league type
                        let displayLeague = lastSeasonResult.leagueType;

                        if (lastSeasonResult.status === "promoted") {
                            if (lastSeasonResult.leagueType === "bronze") displayLeague = "silver";
                            else if (lastSeasonResult.leagueType === "silver") displayLeague = "gold";
                        } else if (lastSeasonResult.status === "demoted") {
                            if (lastSeasonResult.leagueType === "gold") displayLeague = "silver";
                            else if (lastSeasonResult.leagueType === "silver") displayLeague = "bronze";
                        }

                        setLeagueResult({
                            status: lastSeasonResult.status,
                            leagueType: displayLeague,
                        });
                        setShowModal(true);
                    }
                }
            } catch (error) {
                console.error("PromotionManager: Error checking league promotion:", error);
            } finally {
                isFetching.current = false;
            }
        };

        // Initial check
        checkPromotion();

        // Polling for immediate feedback
        const interval = setInterval(() => {
            // Only poll if the document is visible
            if (document.visibilityState === 'visible') {
                checkPromotion();
            }
        }, 60000); // Poll every 60 seconds instead of 10s

        return () => clearInterval(interval);
    }, [isLoaded, isSignedIn, user?.id, isPageReady]);

    const handleClose = async () => {
        setShowModal(false);
        try {
            await fetch("/api/league/ack-promotion", { method: "POST" });
        } catch (error) {
            console.error("PromotionManager: Error acknowledging promotion:", error);
        }
    };

    return (
        <LeaguePromotionModal
            isOpen={showModal}
            onClose={handleClose}
            status={leagueResult?.status || 'safe'}
            leagueType={leagueResult?.leagueType || 'bronze'}
        />
    );
};

export default PromotionManager;
