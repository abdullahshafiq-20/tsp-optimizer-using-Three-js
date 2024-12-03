import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
import cv2
import json
import pandas as pd

def image_to_coordinates(image_path):
    # Read the image
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    # Invert the image if needed (black background to white background)
    _, binary = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
    
    # Find contours
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Get the main contour (assuming the largest one is Pakistan's border)
    main_contour = max(contours, key=cv2.contourArea)
    
    # Simplify the contour to reduce noise
    epsilon = 0.001 * cv2.arcLength(main_contour, True)
    approx_contour = cv2.approxPolyDP(main_contour, epsilon, True)
    
    # Convert contour points to normalized coordinates
    height, width = img.shape
    coordinates = []
    for point in approx_contour:
        # Flip the y-coordinate to match the mathematical coordinate system
        x = (point[0][0] / width) * 80  # Scale to our coordinate system (0-80)
        y = 50 - ((point[0][1] / height) * 50)  # Scale to our coordinate system (0-50)
        coordinates.append([float(x), float(y)])  # Convert to float for JSON serialization
    
    return coordinates

def load_pakistan_cities():
    """Load Pakistan cities data"""
    cities_data = {
        'name': [
            'Karachi', 'Lahore', 'Islamabad', 'Peshawar', 'Quetta', 
            'Multan', 'Faisalabad', 'Rawalpindi', 'Hyderabad', 'Gwadar'
        ],
        'x': [
            45, 52, 48, 42, 37,  # Adjusted x coordinates
            46, 49, 48, 43, 35
        ],
        'y': [
            15, 28, 30, 32, 22,  # Adjusted y coordinates
            24, 26, 30, 18, 13
        ],
        'population': [
            14910352, 11126285, 1014825, 2017617, 1001205,
            1871843, 3203846, 2098231, 1732693, 90762
        ]
    }
    return pd.DataFrame(cities_data)

def draw_pakistan_map(coordinates):
    # Create the figure for both plots
    plt.figure(figsize=(15, 6))
    
    # Original image
    plt.subplot(1, 2, 1)
    img = plt.imread(image_path)
    plt.imshow(img, cmap='gray')
    plt.title('Original Image')
    plt.axis('off')
    
    # Coordinate plot
    plt.subplot(1, 2, 2)
    coords = np.array(coordinates)
    plt.plot(coords[:, 0], coords[:, 1], 'k-', linewidth=2)
    
    # Add cities
    cities_df = load_pakistan_cities()
    
    # Create scatter plot with size based on population
    populations = cities_df['population']
    sizes = 100 * (populations / populations.max()) + 50  # Scale sizes
    
    plt.scatter(cities_df['x'], cities_df['y'], 
               s=sizes, c='red', alpha=0.6, zorder=5)
    
    # Add city labels with different offsets
    offsets = {
        'Islamabad': (5, 10),
        'Rawalpindi': (-20, -5),  # Offset to avoid overlap with Islamabad
        'Lahore': (5, 5),
        'Karachi': (10, -5),
        'Hyderabad': (-20, 5),
        'Quetta': (-20, 0),
        'Peshawar': (5, 5),
        'Multan': (5, -5),
        'Faisalabad': (5, 10),
        'Gwadar': (10, 5)
    }
    
    for _, city in cities_df.iterrows():
        offset = offsets.get(city['name'], (5, 5))  # Default offset if city not in dict
        plt.annotate(city['name'], 
                    (city['x'], city['y']),
                    xytext=offset, 
                    textcoords='offset points',
                    fontsize=8,
                    bbox=dict(facecolor='white', edgecolor='none', alpha=0.7))
    
    # Add coordinate grid
    plt.grid(True, linestyle='--', alpha=0.6)
    
    # Add country labels
    plt.text(15, 20, 'IRAN', fontsize=10)
    plt.text(30, 35, 'AFGHANISTAN', fontsize=10)
    plt.text(45, 45, 'CHINA', fontsize=10)
    plt.text(65, 20, 'INDIA', fontsize=10)
    plt.text(40, 25, 'PAKISTAN', fontsize=12, fontweight='bold')

    # Add border lengths
    plt.text(22, 15, 'Iran: 909 km', fontsize=8, rotation=45)
    plt.text(30, 40, 'Afghanistan: 2,430 km', fontsize=8, rotation=30)
    plt.text(45, 42, 'China: 523 km', fontsize=8, rotation=0)
    plt.text(60, 15, 'India: 2,912 km', fontsize=8, rotation=-45)
    
    plt.xlabel('East-West Coordinate (x)')
    plt.ylabel('North-South Coordinate (y)')
    plt.title('Pakistan Map with Major Cities')
    
    plt.xlim(-5, 85)
    plt.ylim(-5, 55)
    plt.gca().set_aspect('equal', adjustable='box')
    
    plt.tight_layout()
    plt.show()

def save_coordinates(coordinates, output_file):
    """Save coordinates to a JSON file"""
    with open(output_file, 'w') as f:
        json.dump({
            'border_coordinates': coordinates,
            'metadata': {
                'coordinate_system': 'Custom (0-80 x, 0-50 y)',
                'border_lengths': {
                    'Iran': '909 km',
                    'Afghanistan': '2,430 km',
                    'China': '523 km',
                    'India': '2,912 km'
                }
            }
        }, f, indent=2)

def print_coordinates(coordinates):
    """Print coordinates in a readable format"""
    print("\nPakistan Border Coordinates:")
    print("============================")
    print("Format: [X, Y] (East-West, North-South)")
    print("-----------------------------")
    for i, coord in enumerate(coordinates, 1):
        print(f"Point {i:3d}: [{coord[0]:6.2f}, {coord[1]:6.2f}]")
    print("\nCoordinate System:")
    print("- X-axis (East-West): 0-80")
    print("- Y-axis (North-South): 0-50")

if __name__ == "__main__":
    # Path to your Pakistan map image
    image_path = "pakistan-map.png"
    output_file = "pakistan_coordinates.json"
    
    try:
        # Convert image to coordinates
        coordinates = image_to_coordinates(image_path)
        
        # Save coordinates to JSON file
        save_coordinates(coordinates, output_file)
        
        # Print coordinates to console
        print_coordinates(coordinates)
        
        # Draw the map
        draw_pakistan_map(coordinates)
        
        print(f"\nCoordinates have been saved to {output_file}")
        
    except Exception as e:
        print(f"Error: {e}")
        print("Please ensure you have a valid image file at the specified path")
