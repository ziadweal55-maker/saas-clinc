const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary using inline credentials
cloudinary.config({
  cloud_name: 'dlhlrul7q',
  api_key: '854399468864862',
  api_secret: 'AB0tlL1XfWzY9n3-JH__l4-t0oA'
});

async function runOnboarding() {
  try {
    const sampleImageUrl = 'https://res.cloudinary.com/demo/image/upload/dog.jpg';
    console.log(`Starting upload of sample image: ${sampleImageUrl}`);

    // 2. Upload an image
    const uploadResult = await cloudinary.uploader.upload(sampleImageUrl, {
      public_id: 'sample_dog_test'
    });

    console.log('\n--- Upload Success ---');
    console.log(`Secure URL: ${uploadResult.secure_url}`);
    console.log(`Public ID: ${uploadResult.public_id}`);

    // 3. Get image details
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log('\n--- Image Details ---');
    console.log(`Width: ${details.width}px`);
    console.log(`Height: ${details.height}px`);
    console.log(`Format: ${details.format}`);
    console.log(`File Size: ${details.bytes} bytes`);

    // 4. Transform the image
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      // f_auto: Automatically delivers the image in the most optimized format (e.g. AVIF, WebP) supported by the requesting browser.
      fetch_format: 'auto',
      // q_auto: Automatically adjusts the image quality/compression level to minimize file size while preserving visual quality.
      quality: 'auto',
      secure: true
    });

    console.log('\n--- Transformation ---');
    console.log('Done! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);

  } catch (error) {
    console.error('Error during onboarding process:', error);
  }
}

runOnboarding();
