"use client";

import { useEffect, useState } from "react";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";

interface Season {
  _id: string;
  seasonId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface LeagueStats {
  type: string;
  totalUsers: number;
  promoted: any[];
  demoted: any[];
  safe: any[];
  groups: any[];
}

interface EligibleWinner {
  userId: string;
  name: string;
  email: string;
  points: number;
  position: number;
  groupId: string;
}

export default function AdminLeaguePage() {
  const { isLoaded, userId } = useHybridWebUser();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [seasonStats, setSeasonStats] = useState<any>(null);
  const [eligibleWinners, setEligibleWinners] = useState<EligibleWinner[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [raffleWinners, setRaffleWinners] = useState<any>(null);
  const [detailedInfo, setDetailedInfo] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch seasons on load
  useEffect(() => {
    if (isLoaded && userId) {
      fetchSeasons();
    }
  }, [isLoaded, userId]);

  // Fetch data when season is selected
  useEffect(() => {
    if (selectedSeasonId) {
      const fetchAllData = async () => {
        setLoading(true);
        try {
          await Promise.all([
            fetchSeasonStats(),
            fetchEligibleWinners(),
            fetchRaffleWinners(),
            fetchDetailedInfo()
          ]);
        } catch (err) {
          setError("Error loading data");
        } finally {
          setLoading(false);
        }
      };
      fetchAllData();
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/league?action=get_seasons");
      const data = await res.json();
      
      if (res.status === 403) {
        setError("You don't have admin access");
        return;
      }
      
      if (data.seasons) {
        setSeasons(data.seasons);
        if (data.seasons.length > 0 && !selectedSeasonId) {
          setSelectedSeasonId(data.seasons[0].seasonId);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonStats = async () => {
    try {
      const res = await fetch(
        `/api/admin/league?action=get_season_stats&seasonId=${selectedSeasonId}`
      );
      const data = await res.json();
      setSeasonStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchEligibleWinners = async () => {
    try {
      const res = await fetch(
        `/api/admin/league?action=get_eligible_winners&seasonId=${selectedSeasonId}`
      );
      const data = await res.json();
      setEligibleWinners(data.eligibleWinners || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchRaffleWinners = async () => {
    try {
      const res = await fetch(
        `/api/admin/league?action=get_raffle_winners&seasonId=${selectedSeasonId}`
      );
      const data = await res.json();
      setRaffleWinners(data.raffleWinners);
    } catch (err: any) {
      console.error("Error fetching raffle winners:", err);
    }
  };

  const fetchDetailedInfo = async () => {
    try {
      const res = await fetch(
        `/api/admin/league?action=get_detailed_league_info&seasonId=${selectedSeasonId}`
      );
      const data = await res.json();
      setDetailedInfo(data.detailedInfo);
    } catch (err: any) {
      console.error("Error fetching detailed info:", err);
    }
  };

  const fetchDebugInfo = async () => {
    try {
      setDebugLoading(true);
      const res = await fetch(
        `/api/admin/league?action=debug_groups&seasonId=${selectedSeasonId}`
      );
      const data = await res.json();
      setDebugInfo(data.debugInfo);
      console.log("Debug info:", data.debugInfo);
    } catch (err: any) {
      console.error("Error fetching debug info:", err);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleWinnerToggle = (userId: string) => {
    if (selectedWinners.includes(userId)) {
      setSelectedWinners(selectedWinners.filter(id => id !== userId));
    } else {
      if (selectedWinners.length < 3) {
        setSelectedWinners([...selectedWinners, userId]);
      } else {
        alert("You can only select 3 people");
      }
    }
  };

  const handleSaveRaffleWinners = async () => {
    if (selectedWinners.length !== 3) {
      alert("Please select exactly 3 people");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_raffle_winners",
          seasonId: selectedSeasonId,
          winnerUserIds: selectedWinners,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Winners saved successfully");
        fetchRaffleWinners();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomSelect = () => {
    if (eligibleWinners.length < 3) {
      alert("Number of eligible candidates is less than 3");
      return;
    }

    const shuffled = [...eligibleWinners].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map(w => w.userId);
    setSelectedWinners(selected);
  };

  const handleEndSeason = async () => {
    if (!confirm("Are you sure you want to end this season?")) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_season",
          seasonId: selectedSeasonId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Season ended successfully");
        fetchSeasons();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error && error.includes("access")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          League Management - Admin Panel
        </h1>

        {/* Season Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Select Season
          </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEndSeason}
                disabled={!selectedSeasonId}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
              >
                End Season Now
              </button>
            </div>
            <button
              onClick={() => {
                fetchDebugInfo();
                // Smooth scroll to the groups section
                setTimeout(() => {
                  const groupsSection = document.getElementById('league-groups-overview');
                  if (groupsSection) {
                    groupsSection.scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }
                }, 100);
              }}
              disabled={debugLoading}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
                debugLoading 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {debugLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Groups
                </>
              )}
            </button>
          </div>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2"
          >
            {seasons.map((season) => (
              <option key={season.seasonId} value={season.seasonId}>
                {season.seasonId} - {season.isActive ? "Active" : "Ended"} - (
                {new Date(season.startDate).toLocaleDateString("en-US")} to{" "}
                {new Date(season.endDate).toLocaleDateString("en-US")})
              </option>
            ))}
          </select>
        </div>

        {/* Season Statistics */}
        {seasonStats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Season Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {seasonStats.leagues.map((league: LeagueStats) => (
                <div
                  key={league.type}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="text-xl font-bold mb-3 capitalize">
                    {league.type === "gold" ? "Gold" : league.type === "silver" ? "Silver" : "Bronze"} League
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Users:</span>
                      <span className="font-bold">{league.totalUsers}</span>
                    </div>
                    
                    <div className="flex justify-between text-green-600">
                      <span>Promoted:</span>
                      <span className="font-bold">{league.promoted.length}</span>
                    </div>
                    
                    <div className="flex justify-between text-blue-600">
                      <span>Safe (Remaining):</span>
                      <span className="font-bold">{league.safe.length}</span>
                    </div>
                    
                    <div className="flex justify-between text-red-600">
                      <span>Demoted:</span>
                      <span className="font-bold">{league.demoted.length}</span>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        Number of Groups: {league.groups.length}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed League Information */}
        {detailedInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Detailed League and Group Information</h2>
            
            <div className="space-y-6">
              {detailedInfo.leagues.map((league: any) => (
                <div key={league.type} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-xl font-bold mb-3 capitalize">
                    {league.name} ({league.type === "gold" ? "Gold" : league.type === "silver" ? "Silver" : "Bronze"})
                  </h3>
                  
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm">{league.description}</p>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Total Users: </span>
                      <span className="text-blue-600 font-bold">{league.totalUsers}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Groups:</h4>
                    {league.groups.map((group: any) => (
                      <div key={group.groupId} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium">Group {group.groupNumber}</h5>
                          <div className="text-sm text-gray-600">
                            {group.userCount} / {group.maxUsers} users
                          </div>
                        </div>
                        
                        {group.users.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700">Rankings:</div>
                            <div className="space-y-1">
                              {group.users.slice(0, 10).map((user: any, index: number) => (
                                <div key={user.userId} className="flex justify-between items-center text-sm bg-white rounded px-3 py-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-500">#{user.position}</span>
                                    <span className="font-mono text-xs">{user.userId.slice(-8)}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-blue-600">{user.points}</span>
                                    <span className="text-gray-500">points</span>
                                  </div>
                                </div>
                              ))}
                              {group.users.length > 10 && (
                                <div className="text-xs text-gray-500 text-center py-2">
                                  and {group.users.length - 10} more users...
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center py-4">
                            No users in this group
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gold League Winners Section */}
        {eligibleWinners.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                Raffle Eligible Candidates (Top 60% Gold League)
              </h2>
              <div className="space-x-2 space-x-reverse">
                <button
                  onClick={handleRandomSelect}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Random Select 3
                </button>
                <button
                  onClick={handleSaveRaffleWinners}
                  disabled={selectedWinners.length !== 3}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  Save Winners ({selectedWinners.length}/3)
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              Total Eligible: {eligibleWinners.length} candidates
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eligibleWinners.map((winner, index) => (
                    <tr
                      key={winner.userId}
                      className={selectedWinners.includes(winner.userId) ? "bg-yellow-50" : ""}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedWinners.includes(winner.userId)}
                          onChange={() => handleWinnerToggle(winner.userId)}
                          className="w-5 h-5"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {winner.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {winner.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {winner.points} points
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Current Raffle Winners */}
        {raffleWinners && raffleWinners.winners && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-green-800">
              🎉 Raffle Winners for This Season
            </h2>
            <div className="space-y-2">
              {raffleWinners.winners.map((winner: any, index: number) => {
                const winnerDetails = eligibleWinners.find(w => w.userId === winner.userId);
                return (
                  <div
                    key={winner.userId}
                    className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold">
                        Winner #{index + 1}: {winnerDetails?.name || winner.userId}
                      </div>
                      <div className="text-sm text-gray-600">
                        {winnerDetails?.email || "Email unknown"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        winner.prizeAwarded 
                          ? "bg-green-200 text-green-800" 
                          : "bg-yellow-200 text-yellow-800"
                      }`}>
                        {winner.prizeAwarded ? "Prize Awarded" : "Pending Prize"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* League Groups Overview */}
        {debugInfo && (
          <div id="league-groups-overview" className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6">League Groups Overview</h2>
            
            {/* Season Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Season Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Season ID:</span>
                  <span className="ml-2 text-gray-600">{debugInfo.seasonId}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    debugInfo.season.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {debugInfo.season.isActive ? 'Active' : 'Ended'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Total Groups:</span>
                  <span className="ml-2 text-gray-600">{debugInfo.groups.length}</span>
                </div>
              </div>
            </div>

            {/* League Groups Tables */}
            <div className="space-y-8">
              {['bronze', 'silver', 'gold'].map((leagueType) => {
                const leagueGroups = debugInfo.groups.filter((group: any) => 
                  group.leagueType === leagueType
                );
                
                if (leagueGroups.length === 0) return null;

                return (
                  <div key={leagueType} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className={`px-6 py-4 ${
                      leagueType === 'gold' ? 'bg-yellow-50 border-b border-yellow-200' :
                      leagueType === 'silver' ? 'bg-gray-50 border-b border-gray-200' :
                      'bg-orange-50 border-b border-orange-200'
                    }`}>
                      <h3 className={`text-xl font-bold capitalize ${
                        leagueType === 'gold' ? 'text-yellow-800' :
                        leagueType === 'silver' ? 'text-gray-800' :
                        'text-orange-800'
                      }`}>
                        {leagueType === 'gold' ? '🥇' : leagueType === 'silver' ? '🥈' : '🥉'} {leagueType} League
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {leagueGroups.length} group(s) • {leagueGroups.reduce((sum: number, group: any) => sum + group.userCount, 0)} total users
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Group
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Capacity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Users
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Top User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {leagueGroups.map((group: any, index: number) => {
                            const topUser = group.users.length > 0 
                              ? group.users.reduce((max: any, user: any) => 
                                  user.points > max.points ? user : max, group.users[0])
                              : null;
                            
                            const isFull = group.userCount >= group.maxUsers;
                            const isEmpty = group.userCount === 0;
                            
                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      Group {group.groupNumber}
                                    </div>
                                    <div className="ml-2 text-xs text-gray-500">
                                      ({group.groupId.slice(-8)})
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {group.maxUsers} users
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {group.userCount}
                                    </div>
                                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          isFull ? 'bg-green-500' : 
                                          group.userCount > group.maxUsers * 0.7 ? 'bg-yellow-500' : 
                                          'bg-blue-500'
                                        }`}
                                        style={{ 
                                          width: `${Math.min((group.userCount / group.maxUsers) * 100, 100)}%` 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {topUser ? (
                                    <div>
                                      <div className="font-medium">
                                        {topUser.userId.slice(-8)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {topUser.points} points
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">No users</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    isFull ? 'bg-green-100 text-green-800' :
                                    isEmpty ? 'bg-gray-100 text-gray-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {isFull ? 'Full' : isEmpty ? 'Empty' : 'Active'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Detailed Users for each group */}
                    {leagueGroups.map((group: any, groupIndex: number) => (
                      group.users.length > 0 && (
                        <div key={`${leagueType}-${groupIndex}`} className="border-t border-gray-200 bg-gray-50">
                          <div className="px-6 py-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              Group {group.groupNumber} - Users ({group.users.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="px-3 py-2 text-left">Rank</th>
                                    <th className="px-3 py-2 text-left">User ID</th>
                                    <th className="px-3 py-2 text-left">Points</th>
                                    <th className="px-3 py-2 text-left">Joined</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {group.users
                                    .sort((a: any, b: any) => b.points - a.points)
                                    .map((user: any, userIndex: number) => (
                                    <tr key={userIndex} className="hover:bg-gray-50">
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                                          userIndex === 0 ? 'bg-yellow-100 text-yellow-800' :
                                          userIndex === 1 ? 'bg-gray-100 text-gray-800' :
                                          userIndex === 2 ? 'bg-orange-100 text-orange-800' :
                                          'bg-gray-50 text-gray-600'
                                        }`}>
                                          {userIndex + 1}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-gray-700">
                                        <div>
                                          <div className="font-medium">
                                            {user.name || user.userId.slice(-12)}
                                          </div>
                                          {user.email && (
                                            <div className="text-xs text-gray-500">
                                              {user.email}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="font-medium text-blue-600">
                                          {user.points}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-gray-500">
                                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

