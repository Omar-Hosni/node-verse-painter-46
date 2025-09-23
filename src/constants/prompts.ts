export const KONTEXT_RESCENE_PROMPT = `
    INPUTS
    OBJECT = image[0]        # product/prop/thing only
    SCENE  = image[1]        # environment to become the background

    SYSTEM
    - Treat SCENE as the immutable base layer (Layer 0). Do not alter layout/sky/architecture.
    - Extract OBJECT from its photo (Layer 1). Remove/ignore background in image[0].
    - Only add what realism requires: contact shadows, occlusion, minor ground interaction.

    TASK
    Composite OBJECT naturally into SCENE as part of that environment.

    SCENE DETECTION & PLANE CHOICE
    - Detect scene type: {interior | exterior | studio | abstract}, horizon height, dominant planes.
    - Choose one primary support plane for placement:
    • If wall-like → mount/hang/lean; align to verticals.
    • If ground-like (grass/sand/stone/road) → place on ground; align to horizon, feet/base flat.
    • If water/reflective → place on shore/rock/platform; only float if explicitly allowed.
    - If no clear plane (abstract backdrops): center-frame or chosen anchor; create soft drop shadow consistent with a generic key light from SCENE.

    PLACEMENT (use your runtime params)
    - Anchor: {lower-third | center-right | …}
    - Position (0–1): x={0.62}, y={0.58}
    - Scale: {0.25} of frame height (±5%)
    - Orientation: yaw {15}°, pitch {0}°, roll {0}°; adjust to match scene lines/horizon
    - Depth: {foreground | midground | background}; allow partial occlusion if depth demands it

    FIDELITY TO OBJECT
    - Preserve exact geometry, materials, micro-texture, colors, logos. No redesign/stylization.
    - Respect category affordances:
    • Apparel (shirt/hoodie): keep fabric drape; no phantom body unless instructed; if wall plane → hanging or flat-pin.
    • Electronics/glossy: keep specular highlights sharp; add subtle environment reflections only.

    MATCH TO SCENE
    - Perspective/FOV: match vanishing lines; align base to support plane (no floating).
    - Lighting: estimate SCENE key light direction/height; match contrast; add soft contact shadow at touch points; ambient occlusion in crevices.
    - Color/Exposure/Noise: harmonize WB and grain to SCENE.
    - DoF: match focus; blur OBJECT if off the focal plane; never oversharpen edges.

    INTEGRITY CONSTRAINTS
    - Keep SCENE from image[1] intact; no relayout/repaint.
    - Do not duplicate OBJECT or invent extra props/supports (use minimal plausible support only).
    - Output one photorealistic composite.

    NEGATIVE
    floating, halos, wrong scale, warped geometry, mismatched shadows/reflections,
    posterized skin/fabric, duplicated objects, heavy stylization, watermarks/text overlays.
`


export const KONTEXT_RESCENE_OLDER_PROMPT = `
    OBJECT = image[0]          # reference image of the object (any category)
    SCENE  = image[1]          # target scene/background (any environment)

    TASK: Composite OBJECT naturally into SCENE as a real part of that environment.

    Composition
    - Anchor: {lower-third | center-right | custom}
    - Position (normalized 0–1): x={0.62}, y={0.58}
    - Scale: {0.25} of frame height (±5% tolerance)
    - Orientation: yaw {15}°, pitch {0}°, roll {0}° (adjust to match scene lines/horizon)
    - Depth: place OBJECT at the {foreground | midground | background}; allow partial occlusion if depth demands it.

    Fidelity to OBJECT
    - Preserve exact shape, proportions, materials, textures, and distinctive details (logos/labels if present).
    - No redesign or stylization; keep true geometry and surface finish.

    Scene Match
    - Perspective: match SCENE camera FOV and horizon; align base to ground plane without floating.
    - Lighting: estimate SCENE key light direction/intensity; apply consistent shading, ambient occlusion at contacts, and a believable cast shadow matching light angle/softness.
    - Color/exposure: harmonize white balance, contrast, and noise/grain to SCENE.
    - DoF: match focus; if SCENE is shallow DoF and OBJECT is off the focal plane, blur accordingly.
    - Reflections/speculars: add subtle environment reflections appropriate to OBJECT material (glass/metal/water, etc.).

    Integrity
    - Keep SCENE from image[1] intact (do not replace sky/background layout).
    - Add only what’s needed for realism (contact shadows, minor sand/dust/grass at contact if it exists in SCENE).
    - Output a single photorealistic composite.

    NEGATIVE (avoid)
    - Floating/halo edges, wrong scale, warped geometry, duplicated objects, extra components, harsh cutouts,
    mismatched shadows/reflections, oversharpening, watermarks, text overlays, heavy stylization.
`

export const KONTEXT_REFERENCE_BASE_PROMPT = `
    INPUTS
    BASE  = image[0]     # the image to edit
    REF   = image[1]     # the thing to swap in

    GOAL
    Swap the matching element in BASE with REF while preserving BASE composition,
    camera, layout, and scene integrity.

    CORE RULES
    - Scene lock: do not redesign or relayout the scene; edit only where the swap occurs.
    - Detect the target in BASE automatically (category inferred from REF).
    - Remove the original cleanly; no duplicates, no partial leftovers.
    - Align REF to BASE: perspective/FOV, scale, orientation, position, and depth.
    - Match lighting (direction/softness), white balance, contrast, noise/grain, and depth of field.
    - Preserve occlusions (hands, sleeves, hair, glasses) and contact (shadows, reflections).
    - Keep geometry faithful to REF; no stylization unless the Style block is used.
    - Output one photorealistic image.

    NEGATIVE
    no floating, halos, double items, warped hands/faces, text/logo distortion,
    over-sharpen halos, neon color shifts, watermarks, or extra people/props.
`

export const KONTEXT_REFERENCE_CHARACTER_PROMPT = `
[CHARACTER FUSE]
Goal: Integrate the reference character as the main/secondary subject in the base scene.
- Identity: keep face likeness, hairstyle, body shape, and signature features.
- Wardrobe: keep overall outfit silhouette/colors unless [override here].
- Pose: adapt to base context; if conflict, keep base’s original posing logic.
- Placement: [left/right/center | near X], scale to human-realistic height.
- Interaction: if relevant, make the character naturally engage with nearby props/surfaces.
- Skin tones and color grade must match base scene lighting.
- Replace the base subject’s identity (face + primary likeness cues) with REF.
- Keep body pose, camera framing, outfit, and scene exactly as in BASE.
- Blend naturally at neck/hairline; keep base hair unless conflict makes it unrealistic.
- Preserve all occlusions and accessories; maintain correct shadows and color grade.
    
`

export const KONTEXT_REFERENCE_FACE_PROMPT = `
[FACE FUSE]
Goal: Swap the base subject’s face with the reference face while preserving the base head pose.
- Keep reference identity, facial proportions, and skin tone; blend to base neck/ears/hairline.
- Preserve base hair unless [use reference hairline: yes/no].
- Respect gaze direction and expression: [neutral/smile/serious] or “match base”.
- Prevent artifacts: no double eyebrows, no mask seams, no duplicate heads. 
- Replace the base subject’s face with the identity from REF.
- Keep base head pose, gaze direction, and expression unless they contradict realism.
- Seamless blend at hairline/ears/neck; preserve base hair and headwear unless occluded.
- Maintain existing accessories (glasses, hats) with correct occlusion over the new face.
- Adapt skin tone to scene lighting; no double eyebrows/teeth, no mask seams or extra heads.

`

export const KONTEXT_REFERENCE_OBJECT_PROMPT = `
[OBJECT SWAP]
- Infer object class from REF; find the best matching instance in BASE.
- If wearable (watch/bracelet/headphones/glasses): conform to anatomy (strap curve, ear pad seal).
- If handheld: keep original grip and finger wrap; maintain pressure/indentations.
- If tabletop/grounded: keep base plane contact; add soft contact shadow; respect horizon lines.
- Preserve REF materials and details (glass/metal/plastic, logos/markings).
- Add subtle environment reflections appropriate to the material; never over-gloss.
- If multiple candidates exist, swap the most salient/center-most one only.
- If no candidate exists, insert REF plausibly without altering composition (minimal, realistic placement).
`

export const KONTEXT_REFERENCE_STYLE_PROMPT = `
[STYLE FUSE]
Goal: Apply the reference style to the base image without changing its composition.
- Transfer palette, texture, brushwork/pattern language, and tonal contrast from the style ref.
- Protect semantic content: keep all subjects/props readable and undistorted.
- Faces/hands should remain natural and not over-stylized unless explicitly allowed.
- Style strength: [subtle/balanced/strong]; color-grade the whole image consistently.

`

export const KONTEXT_REFERENCE_CLOTH_PROMPT = `
[CLOTH FUSE]
Goal: Retarget the referenced garment/wearable onto the base character.
- Preserve garment cut, print, seams, and hardware (buttons/zip).
- Fit & drape follow body pose; add realistic wrinkles, stretch, and occlusion with arms/hair.
- Align logos/graphics; avoid texture sliding or duplicates.
- If layered over existing clothing, decide: [replace | layer over], then blend edges cleanly.

- Infer garment/accessory type from REF and swap the corresponding item in BASE.
- Retarget fit to body pose and size; preserve REF silhouette, fabric type, prints, and trims.
- Realistic drape: wrinkles/stretch/compression, thickness at seams, collars/cuffs/hem alignment.
- Maintain occlusions with arms, hair, straps, bags; remove the original garment fully.
- For shoes: correct sole contact and weight; for headwear: correct crown/tilt and hair overlap.
- Keep REF colors and logos; avoid texture sliding or UV-like warping on the body.

`