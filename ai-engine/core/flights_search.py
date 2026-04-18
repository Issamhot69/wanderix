import os
import httpx
from typing import Optional

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "ca88515025mshadb79cf1132fd81p1af5abjsned1dc604fc7f")

HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": "booking-com15.p.rapidapi.com",
}

BASE_URL = "https://booking-com15.p.rapidapi.com/api/v1/flights"

AIRPORTS = {
    "marrakech": {"code": "RAK", "city": "Marrakech", "country": "Morocco"},
    "casablanca": {"code": "CAS", "city": "Casablanca", "country": "Morocco"},
    "paris": {"code": "PAR", "city": "Paris", "country": "France"},
    "london": {"code": "LON", "city": "London", "country": "UK"},
    "dubai": {"code": "DXB", "city": "Dubai", "country": "UAE"},
    "new york": {"code": "NYC", "city": "New York", "country": "USA"},
    "barcelona": {"code": "BCN", "city": "Barcelona", "country": "Spain"},
    "tokyo": {"code": "TYO", "city": "Tokyo", "country": "Japan"},
    "amsterdam": {"code": "AMS", "city": "Amsterdam", "country": "Netherlands"},
    "rome": {"code": "ROM", "city": "Rome", "country": "Italy"},
    "istanbul": {"code": "IST", "city": "Istanbul", "country": "Turkey"},
    "bangkok": {"code": "BKK", "city": "Bangkok", "country": "Thailand"},
    "singapore": {"code": "SIN", "city": "Singapore", "country": "Singapore"},
    "sydney": {"code": "SYD", "city": "Sydney", "country": "Australia"},
    "cairo": {"code": "CAI", "city": "Cairo", "country": "Egypt"},
    "mumbai": {"code": "BOM", "city": "Mumbai", "country": "India"},
    "beijing": {"code": "BJS", "city": "Beijing", "country": "China"},
    "seoul": {"code": "SEL", "city": "Seoul", "country": "South Korea"},
    "madrid": {"code": "MAD", "city": "Madrid", "country": "Spain"},
    "frankfurt": {"code": "FRA", "city": "Frankfurt", "country": "Germany"},
}


class FlightsSearchService:

    async def search_destination(self, query: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/searchDestination",
                    headers=HEADERS,
                    params={"query": query},
                    timeout=10,
                )
                data = response.json()
                if data.get("status") and data.get("data"):
                    dest = data["data"][0]
                    return {
                        "id": dest.get("id"),
                        "code": dest.get("code"),
                        "name": dest.get("name"),
                        "type": dest.get("type"),
                    }
                return {}
        except Exception as e:
            return {"error": str(e)}

    async def search_flights(
        self,
        origin: str,
        destination: str,
        date: str,
        return_date: Optional[str] = None,
        adults: int = 1,
        cabin_class: str = "ECONOMY",
        currency: str = "USD",
        language: str = "en",
    ) -> dict:
        try:
            # 1. Trouver les IDs des destinations
            origin_data = await self.search_destination(origin)
            dest_data = await self.search_destination(destination)

            if not origin_data.get("id") or not dest_data.get("id"):
                return {
                    "flights": [],
                    "error": f"Destination not found: {origin} or {destination}",
                    "origin": origin,
                    "destination": destination,
                }

            # 2. Chercher les vols
            params = {
                "fromId": origin_data["id"],
                "toId": dest_data["id"],
                "departDate": date,
                "adults": adults,
                "cabinClass": cabin_class.upper(),
                "currency_code": currency,
                "sort": "BEST",
            }

            if return_date:
                params["returnDate"] = return_date

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/searchFlights",
                    headers=HEADERS,
                    params=params,
                    timeout=20,
                )
                data = response.json()

            if not data.get("status"):
                return {"flights": [], "error": data.get("message", "No flights found"), "origin": origin, "destination": destination}

            # 3. Parser les résultats
            offers = data.get("data", {}).get("flightOffers", [])
            flights = []

            for offer in offers[:10]:
                price_info = offer.get("priceBreakdown", {})
                total_price = price_info.get("total", {}).get("units", 0)
                segments = offer.get("segments", [])

                if not segments:
                    continue

                seg = segments[0]
                legs = seg.get("legs", [])
                first_leg = legs[0] if legs else {}
                last_leg = legs[-1] if legs else {}

                carriers = list(set([
                    leg.get("carriersData", [{}])[0].get("name", "")
                    for leg in legs
                    if leg.get("carriersData")
                ]))

                flights.append({
                    "id": offer.get("token", ""),
                    "price": total_price,
                    "price_formatted": f"{currency} {total_price}",
                    "currency": currency,
                    "origin": {
                        "code": first_leg.get("departureAirport", {}).get("code", ""),
                        "city": first_leg.get("departureAirport", {}).get("cityName", origin),
                    },
                    "destination": {
                        "code": last_leg.get("arrivalAirport", {}).get("code", ""),
                        "city": last_leg.get("arrivalAirport", {}).get("cityName", destination),
                    },
                    "departure": first_leg.get("departureTime", ""),
                    "arrival": last_leg.get("arrivalTime", ""),
                    "duration_minutes": seg.get("totalTime", 0) // 60,
                    "duration": f"{seg.get('totalTime', 0) // 3600}h {(seg.get('totalTime', 0) % 3600) // 60}m",
                    "stops": len(legs) - 1,
                    "carriers": carriers,
                    "cabin_class": cabin_class,
                    "is_cheapest": total_price == min([o.get("priceBreakdown", {}).get("total", {}).get("units", 9999) for o in offers]),
                })

            flights.sort(key=lambda x: x["price"])

            return {
                "flights": flights,
                "total": len(flights),
                "origin": origin,
                "destination": destination,
                "date": date,
                "return_date": return_date,
                "adults": adults,
                "currency": currency,
                "source": "booking.com",
            }

        except Exception as e:
            return {"flights": [], "error": str(e), "origin": origin, "destination": destination}

    async def get_price_calendar(self, origin: str, destination: str, year: int, month: int, currency: str = "USD") -> dict:
        try:
            origin_data = await self.search_destination(origin)
            dest_data = await self.search_destination(destination)

            if not origin_data.get("id") or not dest_data.get("id"):
                return {"calendar": [], "error": "Destination not found"}

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{BASE_URL}/getPriceCalendar",
                    headers=HEADERS,
                    params={
                        "fromId": origin_data["id"],
                        "toId": dest_data["id"],
                        "yearMonth": f"{year}-{month:02d}",
                        "currency_code": currency,
                    },
                    timeout=15,
                )
                data = response.json()

            days = data.get("data", {}).get("days", [])
            calendar = [{"date": d.get("day"), "price": d.get("price"), "is_cheapest": d.get("isCheapest", False)} for d in days if d.get("price")]
            cheapest = min(calendar, key=lambda x: x["price"]) if calendar else None

            return {"calendar": calendar, "cheapest_day": cheapest, "origin": origin, "destination": destination, "currency": currency}

        except Exception as e:
            return {"calendar": [], "error": str(e)}

    def get_airports(self) -> list:
        return [{"key": key, "code": info["code"], "city": info["city"], "country": info["country"]} for key, info in AIRPORTS.items()]