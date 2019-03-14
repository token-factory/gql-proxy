include Configfile

SHELL := /bin/bash

login-ibmcloud:
	ibmcloud login -a https://api.us-east.bluemix.net --apikey $(IBMCLOUD_APIKEY)
	ibmcloud cr login

prereqs-ibmcloud:
	curl -sL https://ibm.biz/idt-installer | bash

test:

lint:
	npm run lint

prune:
	npm prune --production

build-app:
	npm run build:production

docker-image:
	docker build -t $(IMAGE):latest .

push-image:
	docker tag $(IMAGE):latest $(IMAGE_REPO)/$(IMAGE):latest
	docker tag $(IMAGE):latest $(IMAGE_REPO)/$(IMAGE):1.0.0-$(IMAGE_TAG)
	echo "push image to $(IMAGE_REPO)"
	docker push $(IMAGE_REPO)/$(IMAGE):1.0.0-$(IMAGE_TAG)
	docker push $(IMAGE_REPO)/$(IMAGE):latest
	echo "Verify pull image from $(IMAGE_REPO)"
	docker pull $(IMAGE_REPO)/$(IMAGE):1.0.0-$(IMAGE_TAG)

.PHONY: login image push-image test