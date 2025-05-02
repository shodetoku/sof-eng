import React, { useState, useEffect, useRef } from "react";
import "./Sidebar.css";

const SearchBar = ({ onSearch, onClearSearch, isCollapsed }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const suggestionBoxRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // Format display name to show specific locations like in the example
  const formatDisplayName = (place) => {
    if (!place) return "";
    
    const addr = place.address || {};
    
    // If the place has a name that's different from the raw location name
    // use that as the primary identifier (like "Cubao Baptist Church")
    let primaryName = place.name || "";
    
    // If the place represents a specific point of interest
    if (place.type === 'amenity' || 
        place.type === 'shop' || 
        place.type === 'building' ||
        place.type === 'leisure' ||
        place.type === 'office' ||
        place.type === 'education' ||
        place.class === 'amenity' ||
        place.class === 'building') {
      
      // For specific locations like churches, schools, etc.
      let specificLocation = primaryName;
      
      // Add street address if available
      if (addr.road || addr.street) {
        const streetName = addr.road || addr.street;
        const streetNumber = addr.house_number || '';
        
        if (streetNumber && streetName) {
          specificLocation += `, ${streetNumber} ${streetName}`;
        } else if (streetName) {
          specificLocation += `, ${streetName}`;
        }
      }
      
      // Add neighborhood/district and city
      const district = addr.suburb || addr.neighbourhood || addr.district || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      
      if (district && !specificLocation.includes(district)) {
        specificLocation += `, ${district}`;
      }
      
      if (city && !specificLocation.includes(city)) {
        specificLocation += `, ${city}`;
      }
      
      // Add region/province and country code
      const region = addr.state || addr.province || '';
      
      if (region && !specificLocation.includes(region)) {
        specificLocation += `, ${region}`;
      }
      
      if (addr.country_code && addr.country_code.toUpperCase() === 'PH') {
        specificLocation += ', PHL';
      }
      
      return specificLocation;
    } 
    // For general locations (not specific POIs)
    else {
      let locationName = '';
      
      // For administrative units like cities, towns, etc.
      if (addr.city || addr.town || addr.village || addr.municipality) {
        locationName = addr.suburb || addr.neighbourhood || addr.district || primaryName;
        const cityName = addr.city || addr.town || addr.village || addr.municipality;
        
        if (!locationName.includes(cityName)) {
          locationName += `, ${cityName}`;
        }
      } else {
        // If no city info, use the primary name
        locationName = primaryName;
      }
      
      // Add region and country
      const region = addr.state || addr.province || '';
      if (region && !locationName.includes(region)) {
        locationName += `, ${region}`;
      }
      
      if (addr.country_code && addr.country_code.toUpperCase() === 'PH') {
        locationName += ', PHL';
      }
      
      return locationName;
    }
  };

  // Fetch suggestions with improved parameters
  const fetchSuggestions = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    
    try {
      // First approach - search for specific amenities and points of interest
      const poiParams = new URLSearchParams({
        format: 'json',
        q: query,
        countrycodes: 'ph',
        limit: 10,
        addressdetails: 1,
        namedetails: 1,
        'accept-language': 'en',
        // Add these parameters to get more specific places
        dedupe: 1
      });
      
      const poiResponse = await fetch(`https://nominatim.openstreetmap.org/search?${poiParams}`);
      const poiData = await poiResponse.json();
      
      // For queries of sufficient length, perform extended search
      if (query.length >= 3) {
        // Second approach - specifically target amenities and buildings
        const amenityParams = new URLSearchParams({
          format: 'json',
          q: `${query}, Philippines`,
          addressdetails: 1,
          namedetails: 1,
          limit: 8,
          // Look specifically for amenities to get places like schools, churches, etc.
          featuretype: 'amenity building shop office leisure education'
        });
        
        const amenityResponse = await fetch(`https://nominatim.openstreetmap.org/search?${amenityParams}`);
        const amenityData = await amenityResponse.json();
        
        // Third approach - search for general city features for broader matches
        const generalParams = new URLSearchParams({
          format: 'json',
          q: `${query}, Philippines`,
          addressdetails: 1,
          namedetails: 1,
          limit: 5,
          featuretype: 'city city_district suburb neighbourhood town village hamlet'
        });
        
        const generalResponse = await fetch(`https://nominatim.openstreetmap.org/search?${generalParams}`);
        const generalData = await generalResponse.json();
        
        // Combine all results and filter duplicates by place_id
        const combinedResults = [...poiData];
        
        // Add amenity results if not already present
        amenityData.forEach(newItem => {
          if (!combinedResults.some(existingItem => existingItem.place_id === newItem.place_id)) {
            combinedResults.push(newItem);
          }
        });
        
        // Add general results if not already present
        generalData.forEach(newItem => {
          if (!combinedResults.some(existingItem => existingItem.place_id === newItem.place_id)) {
            combinedResults.push(newItem);
          }
        });

        // Format the display names for better presentation
        const formattedResults = combinedResults.map(place => ({
          ...place,
          formatted_name: formatDisplayName(place)
        }));
        
        // Remove duplicates by formatted name and ensure valid coordinates
        const nameSet = new Set();
        const validSuggestions = formattedResults.filter(item => {
          if (!item.formatted_name || !item.lat || !item.lon) return false;
          
          // Prevent duplicate formatted names
          if (nameSet.has(item.formatted_name)) return false;
          nameSet.add(item.formatted_name);
          
          return true;
        });
        
        // Sort results: POIs first, then by importance
        validSuggestions.sort((a, b) => {
          // Prioritize specific places first
          const aIsSpecific = a.type === 'amenity' || a.class === 'amenity' || a.class === 'building';
          const bIsSpecific = b.type === 'amenity' || b.class === 'amenity' || b.class === 'building';
          
          if (aIsSpecific && !bIsSpecific) return -1;
          if (!aIsSpecific && bIsSpecific) return 1;
          
          // Then sort by importance
          return (b.importance || 0.5) - (a.importance || 0.5);
        });
        
        // Limit to reasonable number
        setSuggestions(validSuggestions.slice(0, 10));
      } else {
        // For shorter queries, just use the first results
        const formattedResults = poiData.map(place => ({
          ...place,
          formatted_name: formatDisplayName(place)
        }));
        
        // Remove duplicates
        const nameSet = new Set();
        const validSuggestions = formattedResults.filter(item => {
          if (!item.formatted_name || !item.lat || !item.lon) return false;
          
          if (nameSet.has(item.formatted_name)) return false;
          nameSet.add(item.formatted_name);
          
          return true;
        });
        
        validSuggestions.sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5));
        setSuggestions(validSuggestions.slice(0, 10));
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Handle input change with debounce for search suggestions
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Set new timeout for debounced search
    searchDebounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle Enter press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch(searchQuery);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setSuggestions([]); // clear suggestions

    try {
      // Try different search strategies for better results
      const regularParams = new URLSearchParams({
        format: 'json',
        q: query,
        countrycodes: 'ph',
        limit: 10,
        addressdetails: 1
      });
      
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${regularParams}`);
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        onSearch([parseFloat(lat), parseFloat(lon)]);
      } else {
        // Try a broader search if the first one failed
        const broadParams = new URLSearchParams({
          format: 'json',
          q: `${query}, Philippines`,
          limit: 5,
          addressdetails: 1
        });
        
        const broadResponse = await fetch(`https://nominatim.openstreetmap.org/search?${broadParams}`);
        const broadData = await broadResponse.json();
        
        if (broadData.length > 0) {
          const { lat, lon } = broadData[0];
          onSearch([parseFloat(lat), parseFloat(lon)]);
        } else {
          alert("Location not found in the Philippines. Please try another search.");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Error searching for location");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionClick = (place) => {
    setSearchQuery(place.formatted_name || place.display_name);
    setSuggestions([]);
    onSearch([parseFloat(place.lat), parseFloat(place.lon)]);
  };

  const handleClear = () => {
    setSearchQuery("");
    setSuggestions([]);
    onClearSearch();
  };

  // Close suggestion box when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Clear any pending timeouts when component unmounts
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return (
    <li className="search-bar-container" data-tooltip="Search Location">
      <img src="/icons/searchicon.png" alt="Search" className="search-icon" />
      {!isCollapsed && (
        <div className="search-bar-wrapper" ref={suggestionBoxRef}>
          <input
            type="text"
            placeholder="Search any Philippine location"
            className="search-input"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              aria-label="Clear search"
              disabled={isSearching}
            >
              {isSearching ? (
                <div className="search-spinner"></div>
              ) : (
                <img src="/icons/clear.png" alt="Clear" className="clear-icon" />
              )}
            </button>
          )}

          {suggestions.length > 0 && (
            <ul className="sidebar-suggestions-list">
              {suggestions.map((item, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSuggestionClick(item)}
                  className="sidebar-suggestion-item"
                >
                  {item.formatted_name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

export default SearchBar;