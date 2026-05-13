import base64
import logging
import math
from io import BytesIO
from typing import Optional, Tuple

import httpx
from PIL import Image


MIN_PIXELS = 3686400

ASPECT_RATIOS = {
    "1:1": (1, 1),
    "2:3": (2, 3),
    "3:2": (3, 2),
    "4:5": (4, 5),
    "5:4": (5, 4),
    "16:9": (16, 9),
    "9:16": (9, 16),
    "21:9": (21, 9),
}


def _load_image_bytes(image_url_or_data_url: str) -> bytes:
    if image_url_or_data_url.startswith("data:image"):
        _, b64 = image_url_or_data_url.split(",", 1)
        return base64.b64decode(b64)

    with httpx.Client(timeout=30) as client:
        response = client.get(image_url_or_data_url)
        response.raise_for_status()
        return response.content


def get_image_dimensions(image_url_or_data_url: str) -> Optional[Tuple[int, int]]:
    try:
        content = _load_image_bytes(image_url_or_data_url)
        image = Image.open(BytesIO(content))
        return image.size
    except Exception as e:
        logging.warning("Failed to get image dimensions: %s", e)
        return None


def calculate_closest_ratio(width: int, height: int) -> str:
    if width <= 0 or height <= 0:
        return "1x1"

    image_ratio = width / height
    min_diff = float("inf")
    closest_ratio = "1:1"

    for ratio_name, (w, h) in ASPECT_RATIOS.items():
        target_ratio = w / h
        diff = abs(image_ratio - target_ratio)

        if diff < min_diff:
            min_diff = diff
            closest_ratio = ratio_name

    return closest_ratio.replace(":", "x")


def calculate_ratio_from_image(image_url_or_data_url: str) -> str:
    dimensions = get_image_dimensions(image_url_or_data_url)

    if not dimensions:
        return "1x1"

    width, height = dimensions
    return calculate_closest_ratio(width, height)


def calculate_doubao_size_from_image(image_url_or_data_url: str) -> str:
    dimensions = get_image_dimensions(image_url_or_data_url)

    if not dimensions:
        ratio = 16 / 9
        new_height = int(math.ceil(math.sqrt(MIN_PIXELS / ratio)))
        new_width = int(new_height * ratio)

        new_width = ((new_width + 7) // 8) * 8
        new_height = ((new_height + 7) // 8) * 8

        while new_width * new_height < MIN_PIXELS:
            new_width += 8

        return f"{new_width}x{new_height}"

    width, height = dimensions
    ratio = width / height

    new_height = int(math.ceil(math.sqrt(MIN_PIXELS / ratio)))
    new_width = int(math.ceil(new_height * ratio))

    new_width = ((new_width + 7) // 8) * 8
    new_height = ((new_height + 7) // 8) * 8

    while new_width * new_height < MIN_PIXELS:
        if new_width / new_height < ratio:
            new_width += 8
        else:
            new_height += 8

    return f"{new_width}x{new_height}"
