package validation

import (
	"encoding/json"
	"fmt"
	"os"
)

type AdministrativeData struct {
	Version     string `json:"version"`
	LastUpdated string `json:"last_updated"`
	Country     struct {
		Code string `json:"code"`
		Name string `json:"name"`
	} `json:"country"`
	States []struct {
		Code      string `json:"code"`
		Name      string `json:"name"`
		Type      string `json:"type"`
		IsoCode   string `json:"iso_code"`
		IsActive  bool   `json:"is_active"`
		Districts []struct {
			Code     string `json:"code"`
			Name     string `json:"name"`
			IsActive bool   `json:"is_active"`
		} `json:"districts"`
	} `json:"states"`
}

var adminData AdministrativeData

// LoadAdministrativeData loads the data from the given filepath
// This should be called once on app startup.
func LoadAdministrativeData(filepath string) error {
	fileBytes, err := os.ReadFile(filepath)
	if err != nil {
		return fmt.Errorf("could not read administrative data file: %w", err)
	}

	if err := json.Unmarshal(fileBytes, &adminData); err != nil {
		return fmt.Errorf("could not unmarshal administrative data: %w", err)
	}

	return nil
}

// ValidateLocation checks if a given country, state, and district code exists
// in the loaded administrative data and returns an error if not found.
func ValidateLocation(countryCode, stateCode, districtCode string) error {
	if adminData.Country.Code != countryCode {
		return fmt.Errorf("unsupported country: %s", countryCode)
	}

	stateFound := false
	for _, state := range adminData.States {
		if !state.IsActive {
			continue
		}
		if state.Code == stateCode {
			stateFound = true
			districtFound := false
			for _, district := range state.Districts {
				if !district.IsActive {
					continue
				}
				if district.Code == districtCode {
					districtFound = true
					break
				}
			}
			if !districtFound {
				return fmt.Errorf("unsupported or inactive district: %s in state: %s", districtCode, stateCode)
			}
			break
		}
	}

	if !stateFound {
		return fmt.Errorf("unsupported or inactive state: %s", stateCode)
	}

	return nil
}
