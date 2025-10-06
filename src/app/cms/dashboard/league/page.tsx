"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

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
  const { isLoaded, userId } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [seasonStats, setSeasonStats] = useState<any>(null);
  const [eligibleWinners, setEligibleWinners] = useState<EligibleWinner[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [raffleWinners, setRaffleWinners] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
      fetchSeasonStats();
      fetchEligibleWinners();
      fetchRaffleWinners();
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/league?action=get_seasons");
      const data = await res.json();
      
      if (res.status === 403) {
        setError("شما دسترسی ادمین ندارید");
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
      setLoading(true);
      const res = await fetch(
        `/api/admin/league?action=get_season_stats&seasonId=${selectedSeasonId}`
      );
      const data = await res.json();
      setSeasonStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const handleWinnerToggle = (userId: string) => {
    if (selectedWinners.includes(userId)) {
      setSelectedWinners(selectedWinners.filter(id => id !== userId));
    } else {
      if (selectedWinners.length < 3) {
        setSelectedWinners([...selectedWinners, userId]);
      } else {
        alert("فقط می‌توانید 3 نفر را انتخاب کنید");
      }
    }
  };

  const handleSaveRaffleWinners = async () => {
    if (selectedWinners.length !== 3) {
      alert("لطفا دقیقا 3 نفر را انتخاب کنید");
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
        alert("برندگان با موفقیت ذخیره شدند");
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
      alert("تعداد افراد واجد شرایط کمتر از 3 نفر است");
      return;
    }

    const shuffled = [...eligibleWinners].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map(w => w.userId);
    setSelectedWinners(selected);
  };

  const handleEndSeason = async () => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این فصل را پایان دهید؟")) {
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
        alert("فصل با موفقیت پایان یافت");
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
        <div className="text-xl">در حال بارگذاری...</div>
      </div>
    );
  }

  if (error && error.includes("دسترسی")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          مدیریت لیگ‌ها - پنل ادمین
        </h1>

        {/* Season Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            انتخاب فصل (Season)
          </label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2"
          >
            {seasons.map((season) => (
              <option key={season.seasonId} value={season.seasonId}>
                {season.seasonId} - {season.isActive ? "فعال" : "پایان یافته"} - (
                {new Date(season.startDate).toLocaleDateString("fa-IR")} تا{" "}
                {new Date(season.endDate).toLocaleDateString("fa-IR")})
              </option>
            ))}
          </select>
        </div>

        {/* Season Statistics */}
        {seasonStats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">آمار فصل</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {seasonStats.leagues.map((league: LeagueStats) => (
                <div
                  key={league.type}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="text-xl font-bold mb-3 capitalize">
                    لیگ {league.type === "gold" ? "طلا" : league.type === "silver" ? "نقره" : "برنز"}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>کل کاربران:</span>
                      <span className="font-bold">{league.totalUsers}</span>
                    </div>
                    
                    <div className="flex justify-between text-green-600">
                      <span>ارتقا یافته:</span>
                      <span className="font-bold">{league.promoted.length}</span>
                    </div>
                    
                    <div className="flex justify-between text-blue-600">
                      <span>امن (باقی‌مانده):</span>
                      <span className="font-bold">{league.safe.length}</span>
                    </div>
                    
                    <div className="flex justify-between text-red-600">
                      <span>سقوط کرده:</span>
                      <span className="font-bold">{league.demoted.length}</span>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        تعداد گروه‌ها: {league.groups.length}
                      </div>
                    </div>
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
                افراد واجد شرایط قرعه‌کشی (Top 60% لیگ طلا)
              </h2>
              <div className="space-x-2 space-x-reverse">
                <button
                  onClick={handleRandomSelect}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  انتخاب تصادفی 3 نفر
                </button>
                <button
                  onClick={handleSaveRaffleWinners}
                  disabled={selectedWinners.length !== 3}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  ذخیره برندگان ({selectedWinners.length}/3)
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              تعداد کل واجد شرایط: {eligibleWinners.length} نفر
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      انتخاب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      رتبه
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      نام
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      ایمیل
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      امتیاز
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
                        {winner.points} امتیاز
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
              🎉 برندگان قرعه‌کشی این فصل
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
                        برنده #{index + 1}: {winnerDetails?.name || winner.userId}
                      </div>
                      <div className="text-sm text-gray-600">
                        {winnerDetails?.email || "ایمیل نامشخص"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        winner.prizeAwarded 
                          ? "bg-green-200 text-green-800" 
                          : "bg-yellow-200 text-yellow-800"
                      }`}>
                        {winner.prizeAwarded ? "جایزه اهدا شد" : "در انتظار اهدای جایزه"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        {seasonStats?.isActive && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">عملیات</h2>
            <button
              onClick={handleEndSeason}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
            >
              پایان دادن به این فصل
            </button>
            <p className="text-sm text-gray-600 mt-2">
              با پایان دادن به فصل، کاربران به لیگ‌های جدید منتقل می‌شوند.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

