#!/usr/bin/python

# Import the required modules
import cv2, os, sys
import numpy as np
from PIL import Image

# For face detection we will use the Haar Cascade provided by OpenCV.
cascadePath = "./node_modules/opencv/data/haarcascade_frontalface_alt.xml"
faceCascade = cv2.CascadeClassifier(cascadePath)
positiveDir = "./data/positive/"
negativeDir = "./data/negative/"
trainData = "./train.dat"
testNum = 10

# For face recognition we will the the LBPH Face Recognizer 
recognizer = cv2.createLBPHFaceRecognizer()

def get_images_and_labels(path, isPositive=False):
    # images will contains face images
    images = []
    # labels will contains the label that is assigned to the image
    labels = []
    for name in os.listdir(path) :
        subdir = os.path.join(path, name)
        if not os.path.isdir(subdir): continue

        # Append all the absolute image paths in a list image_paths
        # We will not read the image with the .sad extension in the training set
        # Rather, we will use them to test our accuracy of the training
        image_paths = [os.path.join(subdir, f) for f in os.listdir(subdir)]

        skip_count = 0;
        for image_path in image_paths:
            if isPositive and skip_count < testNum:
                skip_count += 1
                continue
            try:
                # Read the image and convert to grayscale
                image_pil = Image.open(image_path).convert('L')
                # Convert the image format into numpy array
                image = np.array(image_pil, 'uint8')
                faces = faceCascade.detectMultiScale(image)
                for (x, y, w, h) in faces:
                    # Detect the face in the image
                    images.append(image[y: y+h, x: x+w])
                    labels.append(int(name))
                    cv2.imshow("Adding faces to traning set...", image[y: y+h, x: x+w])
                    cv2.waitKey(5)
            except:
                pass
    # return the images list and labels list
    return images, labels


# get image paths of test data
def get_test_set():
    images = []
    subdirs = [os.path.join(positiveDir, name) for name in os.listdir(positiveDir) if os.path.isdir(os.path.join(positiveDir, name))] 
    for subdir in subdirs:
        i = 0
        files = [os.path.join(subdir, f) for f in os.listdir(subdir)]
        for file in files:
            if i < testNum :
                images.append(file)
                i += 1
            else:
                break;
    return images


# Call the get_images_and_labels function and get the face images and the 
# corresponding labels
images, labels = get_images_and_labels(positiveDir, True)
nimages, nlabels = get_images_and_labels(negativeDir);

# merge training data
images.extend(nimages)
labels.extend(nlabels)
cv2.destroyAllWindows()

# Perform the tranining
recognizer.train(images, np.array(labels))

# Save training result
recognizer.save(trainData)

#recognizer.load(trainData)

# Append the images with the extension .sad into image_paths
image_paths = get_test_set()
for image_path in image_paths:
    try:
        predict_image_pil = Image.open(image_path).convert('L')
        predict_image = np.array(predict_image_pil, 'uint8')
        faces = faceCascade.detectMultiScale(predict_image)
        for (x, y, w, h) in faces:
            nbr_predicted, conf = recognizer.predict(predict_image[y: y + h, x: x + w])
            nbr_actual = int(os.path.split(image_path)[0].split("/")[-1])
            if nbr_actual == nbr_predicted:
                print "{} is Correctly Recognized with confidence {}".format(nbr_actual, conf)
            else:
                print "{} is Incorrect Recognized as {}".format(nbr_actual, nbr_predicted)
            cv2.imshow("Recognizing Face", predict_image[y: y + h, x: x + w])
            cv2.waitKey(100)
    except:
        pass

